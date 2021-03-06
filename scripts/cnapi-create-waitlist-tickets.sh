#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright (c) 2014, Joyent, Inc.
#

set -o xtrace
expiry_far=$(/usr/node/bin/node -e 'console.log(new Date((new Date().valueOf()) + 10*1000).toISOString())')
obj="{ \"action\": \"reboot\", \"scope\": \"foo\", \"id\": \"bar\", \"expires_at\": \"$expiry_far\" }"
NUM=$1

for i in $(seq 1 $NUM); do
    sdc-cnapi /servers/$(sysinfo |json UUID)/tickets -X POST -d "$obj" &
done
