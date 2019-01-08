#!/bin/bash

FORCE_COLOR=0

imperative-test-cli config set credential-manager $1
exit $?
