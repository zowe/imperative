#!/bin/bash

FORCE_COLOR=0

imperative-test-cli config profiles $1
exit $?