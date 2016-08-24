#pragma once

#include <iostream>

#include "cxxtest/TestSuite.h"

#include <zcm/message_tracker.hpp>

using namespace std;

class MessageTrackerTest : public CxxTest::TestSuite
{
  public:
    void setUp() override {}
    void tearDown() override {}

    struct example_t {
        uint64_t utime;
        int decode(void* data, int start, int max) { return 0; }
        static const char* getTypeName() { return "example_t"; }
    };

    void testFreqStats()
    {
        constexpr size_t numMsgs = 1000;
        zcm::MessageTracker<example_t> mt(nullptr, "", 0.25, numMsgs);
        for (size_t i = 0; i < 1000; ++i) {
            example_t tmp;
            tmp.utime = i * 1e4;
            mt.newMsg(&tmp, tmp.utime + 1);
            TS_ASSERT_EQUALS(mt.lastMsgHostUtime(), tmp.utime + 1);
        }
        TS_ASSERT_DELTA(mt.getHz(), 100, 1e-5);
        TS_ASSERT_LESS_THAN(mt.getJitterUs(), 1e-5);
    }

    void testGetRange()
    {
        constexpr size_t numMsgs = 1000;
        zcm::MessageTracker<example_t> mt(nullptr, "", 0.25, numMsgs);
        for (size_t i = 0; i < 1000; ++i) {
                example_t tmp;
                tmp.utime = i + 1;
                mt.newMsg(&tmp);
        }

        vector<example_t*> gotRange = mt.getRange(1, 5);
        TS_ASSERT_EQUALS(gotRange.size(), 5);
        for (auto msg : gotRange) {
            TS_ASSERT(msg->utime >= 1 && msg->utime <= 5);
            delete msg;
        }

        gotRange = mt.getRange(5, 5);
        TS_ASSERT_EQUALS(gotRange.size(), 1);
        for (auto msg : gotRange) {
            TS_ASSERT(msg->utime >= 5 && msg->utime <= 5);
            delete msg;
        }

        gotRange = mt.getRange(10, 5);
        TS_ASSERT_EQUALS(gotRange.size(), 0);

        gotRange = mt.getRange(0, 0);
        TS_ASSERT_EQUALS(gotRange.size(), 0);

        gotRange = mt.getRange(1002, 1005);
        TS_ASSERT_EQUALS(gotRange.size(), 0);
    }
};
