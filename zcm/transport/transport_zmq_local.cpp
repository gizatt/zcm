#ifndef DISABLE_ZMQ

#include "zcm/transport.h"
#include "zcm/transport_registrar.h"
#include "zcm/transport_register.hpp"
#include "zcm/util/debug.h"
#include "zcm/util/lockfile.h"
#include <zmq.h>

#include <unistd.h>
#include <dirent.h>

#include <cstdio>
#include <cstring>
#include <cassert>

#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <thread>
using namespace std;

// Define this the class name you want
#define ZCM_TRANS_CLASSNAME TransportZmqLocal
#define MTU (1<<20)
#define ZMQ_IO_THREADS 1
#define IPC_NAME_PREFIX "zcm-channel-zmq-ipc-"
#define IPC_ADDR_PREFIX "ipc:///tmp/" IPC_NAME_PREFIX
#define INPROC_ADDR_PREFIX "inproc://"

enum Type { IPC, INPROC, };

struct ZCM_TRANS_CLASSNAME : public zcm_trans_t
{
    void *ctx;
    Type type;

    unordered_map<string, void*> pubsocks;
    // socket pair contains the socket + whether it was subscribed to explicitly or not
    unordered_map<string, pair<void*, bool>> subsocks;
    bool recvAllChannels = false;

    string recvmsgChannel;
    char recvmsgBuffer[MTU];

    // Mutex used to protect 'subsocks' while allowing
    // recvmsgEnable() and recvmsg() to be called
    // concurrently
    mutex mut;

    ZCM_TRANS_CLASSNAME(Type type_)
    {
        trans_type = ZCM_BLOCKING;
        vtbl = &methods;

        ctx = zmq_init(ZMQ_IO_THREADS);
        assert(ctx != nullptr);
        type = type_;
    }

    ~ZCM_TRANS_CLASSNAME()
    {
        int rc;
        string address;

        // Clean up all publish sockets
        for (auto it = pubsocks.begin(); it != pubsocks.end(); ++it) {
            address = getAddress(it->first);

            rc = zmq_unbind(it->second, address.c_str());
            if (rc == -1) {
                ZCM_DEBUG("failed to unbind pubsock: %s", zmq_strerror(errno));
            }

            rc = zmq_close(it->second);
            if (rc == -1) {
                ZCM_DEBUG("failed to close pubsock: %s", zmq_strerror(errno));
            }
        }

        // Clean up all subscribe sockets
        for (auto it = subsocks.begin(); it != subsocks.end(); ++it) {
            address = getAddress(it->first);

            rc = zmq_disconnect(it->second.first, address.c_str());
            if (rc == -1) {
                ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
            }

            rc = zmq_close(it->second.first);
            if (rc == -1) {
                ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
            }
        }

        // Clean up the zmq context
        rc = zmq_ctx_term(ctx);
        if (rc == -1) {
            ZCM_DEBUG("failed to terminate context: %s", zmq_strerror(errno));
        }
    }

    string getAddress(const string& channel)
    {
        switch (type) {
            case IPC:
                return IPC_ADDR_PREFIX+channel;
            case INPROC:
                return INPROC_ADDR_PREFIX+channel;
        }
        assert(0 && "unreachable");
    }

    bool acquirePubLockfile(const string& channel)
    {
        switch (type) {
            case IPC: {
                string lockfileName = IPC_ADDR_PREFIX+channel;
                return lockfile_trylock(lockfileName.c_str());
            } break;
            case INPROC: {
                // TODO: unimpl for INPROC currently
                return true;
            } break;
        }
        assert(0 && "unreachable");
    }

    // May return null if it cannot create a new pubsock
    void *pubsockFindOrCreate(const string& channel)
    {
        auto it = pubsocks.find(channel);
        if (it != pubsocks.end())
            return it->second;
        // Before we create a pubsock, we need to acquire the lock file for this
        if (!acquirePubLockfile(channel)) {
            ZCM_DEBUG("failed to acquire publish lock on %s, are you attempting multiple publishers?", channel.c_str());
            return nullptr;
        }
        void *sock = zmq_socket(ctx, ZMQ_PUB);
        if (sock == nullptr) {
            ZCM_DEBUG("failed to create pubsock: %s", zmq_strerror(errno));
            return nullptr;
        }
        string address = getAddress(channel);
        int rc = zmq_bind(sock, address.c_str());
        if (rc == -1) {
            ZCM_DEBUG("failed to bind pubsock: %s", zmq_strerror(errno));
            return nullptr;
        }
        pubsocks.emplace(channel, sock);
        return sock;
    }

    // May return null if it cannot create a new subsock
    void *subsockFindOrCreate(const string& channel, bool subExplicit)
    {
        auto it = subsocks.find(channel);
        if (it != subsocks.end()) {
            it->second.second |= subExplicit;
            return it->second.first;
        }
        void *sock = zmq_socket(ctx, ZMQ_SUB);
        if (sock == nullptr) {
            ZCM_DEBUG("failed to create subsock: %s", zmq_strerror(errno));
            return nullptr;
        }
        string address = getAddress(channel);
        int rc;
        rc = zmq_connect(sock, address.c_str());
        if (rc == -1) {
            ZCM_DEBUG("failed to connect subsock: %s", zmq_strerror(errno));
            return nullptr;
        }
        rc = zmq_setsockopt(sock, ZMQ_SUBSCRIBE, "", 0);
        if (rc == -1) {
            ZCM_DEBUG("failed to setsockopt on subsock: %s", zmq_strerror(errno));
            return nullptr;
        }
        subsocks.emplace(channel, make_pair(sock, subExplicit));
        return sock;
    }

    void ipcScanForNewChannels()
    {
        const char *prefix = IPC_NAME_PREFIX;
        size_t prefixLen = strlen(IPC_NAME_PREFIX);

        DIR *d;
        dirent *ent;

        if (!(d=opendir("/tmp/")))
            return;

        while ((ent=readdir(d)) != nullptr) {
            if (strncmp(ent->d_name, prefix, prefixLen) == 0) {
                string channel(ent->d_name + prefixLen);
                void *sock = subsockFindOrCreate(channel, false);
                if (sock == nullptr) {
                    ZCM_DEBUG("failed to open subsock in scanForNewChannels(%s)", channel.c_str());
                }
            }
        }

        closedir(d);
    }

    // XXX This only works for channels within this instance! Creating another
    //     ZCM instance using 'inproc' will cause this scan to miss some channels!
    //     Need to implement a better technique. Should use a globally shared datastruct.
    void inprocScanForNewChannels()
    {
        for (auto& elt : pubsocks) {
            auto& channel = elt.first;
            void *sock = subsockFindOrCreate(channel, false);
            if (sock == nullptr) {
                ZCM_DEBUG("failed to open subsock in scanForNewChannels(%s)", channel.c_str());
            }
        }
    }

    /********************** METHODS **********************/
    size_t getMtu()
    {
        return MTU;
    }

    int sendmsg(zcm_msg_t msg)
    {
        string channel = msg.channel;
        if (channel.size() > ZCM_CHANNEL_MAXLEN)
            return ZCM_EINVALID;
        if (msg.len > MTU)
            return ZCM_EINVALID;

        void *sock = pubsockFindOrCreate(channel);
        if (sock == nullptr)
            return ZCM_ECONNECT;
        int rc = zmq_send(sock, msg.buf, msg.len, 0);
        if (rc == (int)msg.len)
            return ZCM_EOK;
        assert(rc == -1);
        ZCM_DEBUG("zmq_send failed with: %s", zmq_strerror(errno));
        return ZCM_EUNKNOWN;
    }

    int recvmsgEnable(const char *channel, bool enable)
    {
        // Mutex used to protect 'subsocks' while allowing
        // recvmsgEnable() and recvmsg() to be called
        // concurrently
        unique_lock<mutex> lk(mut);

        // TODO: make this prettier
        if (channel == NULL) {
            if (enable) {
                recvAllChannels = enable;
            } else {
                for (auto it = subsocks.begin(); it != subsocks.end(); ) {
                    if (!it->second.second) { // This channel is only subscribed to implicitly
                        string address = getAddress(it->first);
                        int rc = zmq_disconnect(it->second.first, address.c_str());
                        if (rc == -1) {
                            ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
                            return ZCM_ECONNECT;
                        }

                        rc = zmq_close(it->second.first);
                        if (rc == -1) {
                            ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
                            return ZCM_ECONNECT;
                        }
                        it = subsocks.erase(it);
                    } else {
                        ++it;
                    }
                }
            }
            return ZCM_EOK;
        } else {
            if (enable) {
                void *sock = subsockFindOrCreate(channel, true);
                if (sock == nullptr)
                    return ZCM_ECONNECT;
            } else {
                auto it = subsocks.find(channel);
                if (it != subsocks.end()) {
                    if (it->second.second) { // This channel has been subscribed to explicitly
                        if (recvAllChannels) {
                            it->second.second = false;
                        } else {
                            string address = getAddress(it->first);
                            int rc = zmq_disconnect(it->second.first, address.c_str());
                            if (rc == -1) {
                                ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
                                return ZCM_ECONNECT;
                            }

                            rc = zmq_close(it->second.first);
                            if (rc == -1) {
                                ZCM_DEBUG("failed to disconnect subsock: %s", zmq_strerror(errno));
                                return ZCM_ECONNECT;
                            }
                            subsocks.erase(it);
                        }
                    }
                }
            }
            return ZCM_EOK;
        }
    }

    int recvmsg(zcm_msg_t *msg, int timeout)
    {
        // Build up a list of poll items
        vector<zmq_pollitem_t> pitems;
        vector<string> pchannels;
        {
            // Mutex used to protect 'subsocks' while allowing
            // recvmsgEnable() and recvmsg() to be called
            // concurrently
            unique_lock<mutex> lk(mut);

            if (recvAllChannels) {
                switch (type) {
                    case IPC: ipcScanForNewChannels();
                    case INPROC: inprocScanForNewChannels();
                }
            }

            pitems.resize(subsocks.size());
            int i = 0;
            for (auto& elt : subsocks) {
                auto& channel = elt.first;
                auto& sock = elt.second.first;
                auto *p = &pitems[i];
                memset(p, 0, sizeof(*p));
                p->socket = sock;
                p->events = ZMQ_POLLIN;
                pchannels.emplace_back(channel);
                i++;
            }
        }

        timeout = (timeout >= 0) ? timeout : -1;
        int rc = zmq_poll(pitems.data(), pitems.size(), timeout);
        // XXX: implement better error handling, but can't assert because this triggers during
        //      clean up of the zmq subscriptions and context (may need to look towards having a
        //      "ZCM_ETERM" return code that we can use to cancel the recv message thread
        if (rc == -1) {
            ZCM_DEBUG("zmq_poll failed with: %s", zmq_strerror(errno));
            return ZCM_EAGAIN;
        }
        if (rc >= 0) {
            for (size_t i = 0; i < pitems.size(); i++) {
                auto& p = pitems[i];
                if (p.revents != 0) {
                    int rc = zmq_recv(p.socket, recvmsgBuffer, MTU, 0);
                    if (rc == -1) {
                        ZCM_DEBUG("zmq_recv failed with: %s", zmq_strerror(errno));
                        // XXX: implement error handling, don't just assert
                        assert(0 && "unexpected codepath");
                    }
                    assert(0 < rc && rc < MTU);
                    recvmsgChannel = pchannels[i];
                    msg->channel = recvmsgChannel.c_str();
                    msg->len = rc;
                    msg->buf = recvmsgBuffer;

                    // Note: This is probably fine and there probably isn't an elegant
                    //       way to improve this, but we could technically have more than
                    //       one socket with a message ready, but because our API is set
                    //       up to only handle one message at a time, we don't read all
                    //       the messages that are ready, only the first. You could
                    //       imagine a case where one channel was at a very high freq
                    //       and getting interpreted first could shadow a low freq message
                    //       on a resource constrained system, though perhaps that's just
                    //       and indicator that you need to optimize your code or do less.

                    return ZCM_EOK;
                }
            }
        }

        return ZCM_EAGAIN;
    }

    /********************** STATICS **********************/
    static zcm_trans_methods_t methods;
    static ZCM_TRANS_CLASSNAME *cast(zcm_trans_t *zt)
    {
        assert(zt->vtbl == &methods);
        return (ZCM_TRANS_CLASSNAME*)zt;
    }

    static size_t _getMtu(zcm_trans_t *zt)
    { return cast(zt)->getMtu(); }

    static int _sendmsg(zcm_trans_t *zt, zcm_msg_t msg)
    { return cast(zt)->sendmsg(msg); }

    static int _recvmsgEnable(zcm_trans_t *zt, const char *channel, bool enable)
    { return cast(zt)->recvmsgEnable(channel, enable); }

    static int _recvmsg(zcm_trans_t *zt, zcm_msg_t *msg, int timeout)
    { return cast(zt)->recvmsg(msg, timeout); }

    static void _destroy(zcm_trans_t *zt)
    { delete cast(zt); }

    static const TransportRegister regIpc;
    static const TransportRegister regInproc;
};

zcm_trans_methods_t ZCM_TRANS_CLASSNAME::methods = {
    &ZCM_TRANS_CLASSNAME::_getMtu,
    &ZCM_TRANS_CLASSNAME::_sendmsg,
    &ZCM_TRANS_CLASSNAME::_recvmsgEnable,
    &ZCM_TRANS_CLASSNAME::_recvmsg,
    NULL, // update
    &ZCM_TRANS_CLASSNAME::_destroy,
};

static zcm_trans_t *createIpc(zcm_url_t *url)
{
    return new ZCM_TRANS_CLASSNAME(IPC);
}

static zcm_trans_t *createInproc(zcm_url_t *url)
{
    return new ZCM_TRANS_CLASSNAME(INPROC);
}

// Register this transport with ZCM
#ifndef DISABLE_TRANS_IPC
const TransportRegister ZCM_TRANS_CLASSNAME::regIpc(
    "ipc",    "Transfer data via Inter-process Communication (e.g. 'ipc')", createIpc);
#endif

#ifndef DISABLE_TRANS_INPROC
const TransportRegister ZCM_TRANS_CLASSNAME::regInproc(
    "inproc", "Transfer data via Internal process memory (e.g. 'inproc')",  createInproc);
#endif

#endif
