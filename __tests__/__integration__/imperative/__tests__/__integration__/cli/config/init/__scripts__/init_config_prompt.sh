#!/bin/bash

FORCE_COLOR=0

echo "fakeValue" | imperative-test-cli config init $1
exit $?
