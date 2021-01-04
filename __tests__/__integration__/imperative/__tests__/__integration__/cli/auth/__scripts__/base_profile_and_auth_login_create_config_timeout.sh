#!/bin/bash

baseUser=$1
basePass=$2

# First create a base profile
imperative-test-cli config init --ci
CMDRC=$?
if [ $CMDRC -gt 0 ]
then
    echo "Creating a test_base config failed!" 1>&2
    exit $CMDRC
fi

imperative-test-cli auth login fruit --user "$baseUser" --password "$basePass"
CMDRC=$?
if [ $CMDRC -gt 0 ]
then
    echo "Logging into auth of type fruit failed!" 1>&2
    exit $CMDRC
fi