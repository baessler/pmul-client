#!/usr/bin/python3

"""
This script starts the P_MUL daemon.
"""
import pmul
import asyncio
import argparse

PMUL_SERVER_PORT = 32103
    
def init_arguments(conf):
    parser = argparse.ArgumentParser()
    parser.add_argument('-b', '--bind', type=str)
    parser.add_argument('-p', '--port', type=str)
    parser.add_argument('-m', '--multicast', type=str)
    args = parser.parse_args()

    if args.bind is not None:
        conf['src_ipaddr'] = args.bind
    if args.multicast is not None:
        conf['mcast_ipaddr'] = args.multicast
    if args.port is not None:
        conf['daemon_port'] = args.port
    else:
        conf['daemon_port'] = PMUL_SERVER_PORT        

async def forever():
    while True:
        try:
            await asyncio.sleep(1)
        except KeyboardInterrupt:
            pass

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    conf = pmul.conf_init()
    init_arguments(conf)
    conf['loop'] = loop

    print('Created P_MUL daemon')
    coro = pmul.create_pmul_endpoint(pmul.PmulDaemon, loop, conf);
    protocol, transport = loop.run_until_complete(coro)
    loop.run_until_complete(forever())
    loop.close()
