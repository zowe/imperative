#!/bin/bash

baseUser=$1
basePass=$2

# First create a base profile
imperative-test-cli config init --prompt false --user
CMDRC=$?
if [ $CMDRC -gt 0 ]
then
    echo "Creating a test_base config failed!" 1>&2
    exit $CMDRC
fi

imperative-test-cli config set "profiles.my_base.properties.user" "$baseUser" --user
if [ $CMDRC -gt 0 ]
then
    echo "Setting user of config failed!" 1>&2
    exit $CMDRC
fi

imperative-test-cli config set "profiles.my_base.properties.password" "$basePass" --user
if [ $CMDRC -gt 0 ]
then
    echo "Setting password of config failed!" 1>&2
    exit $CMDRC
fi

imperative-test-cli config set "defaults.base" "my_base" --global --user
if [ $CMDRC -gt 0 ]
then
    echo "Setting default base profile in config failed!" 1>&2
    exit $CMDRC
fi

# Next login to fruit auth
imperative-test-cli auth login fruit
CMDRC=$?
if [ $CMDRC -gt 0 ]
then
    echo "Logging into auth of type fruit failed!" 1>&2
    exit $CMDRC
fi

# Now show contents of base profile
imperative-test-cli config list
CMDRC=$?
if [ $CMDRC -gt 0 ]
then
    echo "Listing config of type base failed!" 1>&2
    exit $CMDRC
fi
