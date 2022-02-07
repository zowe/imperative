#!/bin/bash

imperative-test-cli profiles delete secured test || true

imperative-test-cli profiles delete base test || true

imperative-test-cli profiles delete oldNameProf myOldProf || true