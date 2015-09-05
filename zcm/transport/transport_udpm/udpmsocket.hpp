#pragma once
#include "udpm.hpp"

class Buffer;
class UDPMSocket
{
  public:
    UDPMSocket();
    ~UDPMSocket();
    bool isOpen();
    void close();

    bool init();
    bool joinMulticastGroup(struct in_addr multiaddr);
    bool setTTL(u8 ttl);
    bool bindPort(u16 port);
    bool setReuseAddr();
    bool setReusePort();
    bool enablePacketTimestamp();
    bool enableLoopback();

    size_t getRecvBufSize();
    size_t getSendBufSize();

    // Returns true when there is a packet available for receiving
    bool waitUntilData();
    size_t recvBuffer(Buffer *b);

    ssize_t sendBuffers(struct sockaddr_in *dest, const char *a, size_t alen);
    ssize_t sendBuffers(struct sockaddr_in *dest, const char *a, size_t alen,
                            const char *b, size_t blen);
    ssize_t sendBuffers(struct sockaddr_in *dest, const char *a, size_t alen,
                        const char *b, size_t blen, const char *c, size_t clen);

    static UDPMSocket createSendSocket(struct in_addr multiaddr, u8 ttl);
    static UDPMSocket createRecvSocket(struct in_addr multiaddr, u16 port);

  private:
    SOCKET fd = -1;

  private:
    // Disallow copies
    UDPMSocket(const UDPMSocket&) = delete;
    UDPMSocket& operator=(const UDPMSocket&) = delete;

  public:
    // Allow moves
    UDPMSocket(UDPMSocket&& other) { std::swap(this->fd, other.fd); }
    UDPMSocket& operator=(UDPMSocket&& other) { std::swap(this->fd, other.fd); return *this; }
};
