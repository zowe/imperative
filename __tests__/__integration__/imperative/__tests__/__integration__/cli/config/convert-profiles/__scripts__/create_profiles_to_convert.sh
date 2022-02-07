#!/bin/bash

imperative-test-cli profiles create secured test --info hello --secret world
if [ $? -gt 0 ]
then
    exit $?
fi

imperative-test-cli profiles create base test --host example.com
if [ $? -gt 0 ]
then
    exit $?
fi

imperative-test-cli profiles create oldNameProf myOldProf --hostname ConvertToHost.com --username ConvertToUser --pass ConvertToPassword  --token ConvertToTokenValue
exit $?
