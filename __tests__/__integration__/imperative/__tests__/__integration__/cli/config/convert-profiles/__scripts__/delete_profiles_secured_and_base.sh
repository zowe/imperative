#!/bin/bash

imperative-test-cli profiles delete secured test
if [ $? -gt 0 ]
then
    exit $?
fi

imperative-test-cli profiles delete base test
exit $?
