#!/bin/bash
set -e

imperative-test-cli config init --prompt false
imperative-test-cli config set profiles.my_base.properties.info origConfig

imperative-test-cli config auto-init $@
