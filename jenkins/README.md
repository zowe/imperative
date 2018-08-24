# Jenkins Machine Information

This document covers important information about the Jenkins environment.

## Machine Details

- **ADDRESS:** **REMOVED**
- **OWNER:**  **REMOVED**
- **PROJECT:** **REMOVED**
- **AGENT:** ca-jenkins-agent ([ahumanfromca/jenkins-npm-keytar])


## Pipeline Script

The pipeline script is found in the project root's Jenkinsfile. Refer to that file for information about the pipeline steps.

## Keytar Requirements (Historical Information)

***08-24-2018:** Information in this section has been left for historical purposes. The processes have been improved by incorporating these techniques in the base docker-containers.*

The following sections describe the steps that were taken to ensure that the keytar Node module can be used on the agent.

### Overview
In the Integration Test step of the pipeline, note the following statement:

```groovy
sh "chmod +x $TEST_SCRIPT && dbus-launch $TEST_SCRIPT"
```

This command is used to run the tests. `$TEST_SCRIPT` is a string that points to `./jenkins/integration_test.sh`. The next section talks about that command in further detail.

***08-24-2018:** The script linked to has been deleted. Here were the contents at the time of the deletion.*

```bash
#!/usr/bin/env bash

# Unlock the keyring
echo 'jenkins' | gnome-keyring-daemon --unlock

# Run the tests
npm run test:integration
```

At a high level, this command performs the following actions: 

1. Gives execute permissions to the shell script.
2. Executes the shell script in a D-Bus session.

The shell script performs the following actions: 

1. Unlocks the gnome-keyring.
2. Runs the tests.

### What is the gnome-keyring?

The gnome-keyring is where credentials are ultimately stored by keytar.

#### Why Unlock the Keyring? 

Until the keyring is unlocked, nothing can have access to it. This is normally done automatically when in a Linux GUI environment but the agent is not a GUI environment. Therefore, the keyring must be unlocked before keytar can perform credential access. 

### What Does `dbus-launch` Do?

***DISCLAIMER:** This is not intended to be a full deep dive into D-Bus. This is only meant as a high level overview. If you want more info, you will need to research on your own.*

D-Bus is essentially a message service bus that allows applications running within the same D-Bus session to communicate with eachother. The underlying libsecret library adheres to the SecretService standard, which ties into D-Bus. 

keytar/libsecret cannot operate properly without a proper D-Bus session.

There is no D-Bus session available when the Jenkins agent is spawned, so one needs to be started. Without starting a D-Bus session, it is impossible to unlock the keyring and allow keytar to access it (there is no mechanism for the two applications to communicate). Thus, a D-Bus session must be created and both the keyring unlock and the test execution must be run witin this session. `dbus-launch` accomplishes this, but only for the lifetime of the executed shell script.

#### Why is the Shell Script Required?

It comes down to this:

`dbus-launch A && B` is the same as `dbus-launch A` && `b`. There may be a way that both could be executed under the same command, but that would pose a problem for readiblity. Plus, during development, it was unknown how many commands would need to be executed. So for scalibility reasons, this was done in a shell script.

### Why Doesn't `npm run test:integration` Accomplish This?

The following logical process explains why this workaround is necessary to succesfully test the framework.

1. **Imperative** needs to be tested in a CI environment.
2. The **DefaultCredentialManager** is a feature in **Imperative**.
3. To say that **Imperative** is fully tested, the **DefaultCredentialManager** must be tested.
4. The **DefaultCredentialManager** depends on an npm library **keytar**.
5. On *Linux*, **keytar** depends on **libsecret**.
6. **libsecret** depends on the **gnome-keyring**.
7. **libsecret** communicates with the **gnome-keyring** through the **D-Bus Secret Service API**.
8. The **gnome-keyring** can only be accessed if unlocked.

### Final Note

After we performed the steps above, we aso needed to perform the following additional step:

The docker container spawned for the image must be running in privileged mode. If not, you will see a message like the following when the shell script tries to unlock the keyring:

```
gnome-keyring-daemon: Operation not permitted
```

On Jenkins, this requires you to check the `Run container privileged` container setting for the agent. (Only admins of Jenkins are able to check this setting.)

For more information about the environment of the Jenkins agent we use, start here: [ahumanfromca/jenkins-npm-keytar]


[ahumanfromca/jenkins-npm-keytar]: https://hub.docker.com/r/ahumanfromca/jenkins-npm-keytar/
[imperative]: **REMOVED**
[imperative-blue-ocean]: **REMOVED**
