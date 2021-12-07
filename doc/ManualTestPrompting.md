# Imperative CLI - Manual testing of prompting

This document provides commands to provide manual testing of command prompting.
To perform automated tests on prompting, you can use the `echo` shell command.
For example: `echo SYS1.PROCLIB | zowe files list ds PROMPT*`

NOTE: The default string to indicate prompt for the value is 'prompt*'.  This is case-insensitive.

## Simple

### Command:  

zowe files list ds PrOMpT*

### Prompt:

"dataSetName" Description: The name or pattern of the data set that you want to list\
Please enter "dataSetName":

### Response:
```
XXXXXXX\
XXXXXXX.A1543723.A035409\
XXXXXXX.A1543723.A035409.DATA\
XXXXXXX.A1543723.A035409.INDEX\
XXXXXXX.CLIST\
XXXXXXX.CNTL\
XXXXXXX.ISPF.ISPPROF\
XXXXXXX.RECEIVE.MAIL\
XXXXXXX.SYSUDUMP\
XXXXXXX.TEST.CNTL\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657.DATA\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657.INDEX\
```
### -----------------------------------------------------------------------------------------------------------------------------------------------

### Command:  

zowe files list ds prompt* --max prompt*

### Prompt:

"dataSetName" Description: The name or pattern of the data set that you want to list\
Please enter "dataSetName":\
"max-length" Description: The option --max-length specifies the maximum number of items to return. Skip this parameter to return all items. If you specify an incorrect value, the parameter returns up to 1000 items.\
Please enter "max-length":

### Response (max-length = 5):
```
XXXXXXX\
XXXXXXX.A1543723.A035409\
XXXXXXX.A1543723.A035409.DATA\
XXXXXXX.A1543723.A035409.INDEX\
XXXXXXX.CLIST\
```
### -----------------------------------------------------------------------------------------------------------------------------------------------

### Command:  

zowe files list ds prompt* --user prompt* --password prompt*

### Prompt:

"dataSetName" Description: The name or pattern of the data set that you want to list\
Please enter "dataSetName":\
"user" Description: Mainframe (z/OSMF) user name, which can be the same as your TSO login.\
Please enter "user":\
"password" Description: Mainframe (z/OSMF) password, which can be the same as your TSO password.\
Please enter "password":

### Response:
```
XXXXXXX\
XXXXXXX.A1543723.A035409\
XXXXXXX.A1543723.A035409.DATA\
XXXXXXX.A1543723.A035409.INDEX\
XXXXXXX.CLIST\
XXXXXXX.CNTL\
XXXXXXX.ISPF.ISPPROF\
XXXXXXX.RECEIVE.MAIL\
XXXXXXX.SYSUDUMP\
XXXXXXX.TEST.CNTL\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657.DATA\
XXXXXXX.ZOSFILE.VSAM.A1548874.A540657.INDEX\
```
### -----------------------------------------------------------------------------------------------------------------------------------------------

### Command:  

zowe jobs list jobs --owner prompt*

### Prompt:

"owner" Description: Specify the owner of the jobs you want to list. The owner is the individual/user who submitted the job OR the user ID assigned to the job. The command does not prevalidate the owner. You can specify a wildcard according to the z/OSMF Jobs REST
endpoint documentation, which is usually in the form "USER*".\
Please enter "owner":

### Response:
```
TSU29166   XXXXX03 ACTIVE
JOB30155   XXXXX0G INPUT
JOB29783   XXXXX0G INPUT
JOB29478   XXXXX0G INPUT
```
### -----------------------------------------------------------------------------------------------------------------------------------------------

### Command:  

zowe ims query program prompt*

### Prompt:

"names" Description: Specifies the names of the programs to query.\
Please enter "names":

### Response:
```
dopt cc bmpt dfnt    gpsb fp tmim                 rgnt pgm      schd   tls lrsdnt mbr  tmcr\
N    0  Y    MODBLKS N    N  2019.080 05:48:43.58 BMP  DFSSAM01 SERIAL N   N      IMJJ 2019.032 05:12:03.54\
N    0  N    MODBLKS N    N  2019.080 05:48:43.58 MPP  DFSSAM05 SERIAL N   N      IMJJ 2019.032 05:12:03.54\
```

### -----------------------------------------------------------------------------------------------------------------------------------------------

Over-riding the default prompt string.

Define the environmental variable, ZOWE_PROMPT_PHRASE, and set it's value to 'pmpt#'.

### Command:  

zowe files list ds pmpt# --max pmpt#

### Prompt:

"dataSetName" Description: The name or pattern of the data set that you want to list
Please enter "dataSetName":
"max-length" Description: The option --max-length specifies the maximum number of items to return. Skip this parameter to return all items. If you specify an incorrect value, the parameter returns up to 1000 items.
Please enter "max-length":

### Response:
```
XXXXXXX
XXXXXXX.A1543723.A035409
XXXXXXX.A1543723.A035409.DATA
XXXXXXX.A1543723.A035409.INDEX
XXXXXXX.CLIST

```