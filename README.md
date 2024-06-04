# AwsImporter

The AwsImporter plugin allows users to include time-series observations from AWS resources within an Impact Framework pipeline, using Tags to identify resources and CloudWatch to provide metrics. This information is then used to populate usage params in your manifest's tree, providing disk, memory and CPU utilization data for further calculations of energy use, carbon emissions or intensity. The plugin currently supports EC2 VM and EBS attached storage types.

## AWS Set-up

### 1. Create an AWS VM instance
You can create one using [console.aws.amazon.com](https://console.aws.amazon.com/console/home).  <br/>

<b>Note:</b>
For our porposes we used an Amazon Linux AMI. (amazon/al2023-ami-2023.3.20240312.0)

### 2. Create readonly user

Create an IAM user without console access. This will allow read only access to the required metrics.
Assign to the user only the following AWS Managed policies:
1. CloudWatchReadOnlyAccess
2. AmazonEC2ReadOnlyAccess

Export the access keys and store them safely. Will be needed at step 6.

### 3. Create a IAM role to allow EC2 to push data to CW
Create an IAM role and assign it the AWS Managed policy "CloudWatchAgentServerPolicy". Add a Trust Relationship as described below.
<details>
<summary>IAM Trust Relationship</summary>
<br>

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
```

</details>

### 4. Configure CloudWatch agent
Install cloudwatch agent on the VM. Use the relevant command based on your distribution of Linux. You can use the [AWS Cloudwatch Agent Configuration wizard](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-wizard.html)

The cloudwatch agent config looked like this for us (by default is should be /opt/aws/amazon-cloudwatch-agent/bin/config. json if you used the wizard):
<details>
<summary>Cloudwatch Agent Configuration</summary>
<br>

```json
{
    "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "cwagent"
    },
    "metrics": {
        "namespace": "CloudwatchAgentMetrics",
        "append_dimensions": {
            "ImageId": "${aws:ImageId}",
            "InstanceId": "${aws:InstanceId}",
            "InstanceType": "${aws:InstanceType}"
        },
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "totalcpu": true,
                "resources": [
                    "*"
                ]
            },
            "disk": {
                "measurement": [
                    "used_percent",
                    "free",
                    "used",
                    "total"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent",
                    "mem_available_percent"
                    "mem_total"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
```

</details>

### 5. (Optional) Check the metrics in AWS Cloudwatch

See [here](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/PublishMetrics.html#ViewGraphs) for more details.

### 6. Add credentials to `.env`

To manage your AWS authentication details securely, you can create a file called .env in the main directory of your project. This file serves as a convenient location to store sensitive information like access keys and secret keys. By storing this information in a dedicated file, you can easily access and manage your AWS authentication details across your project.

In the .env file, you'll define key-value pairs for your AWS credentials, following a specific format. For example:

```txt
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

Replace your_access_key_id and your_secret_access_key with your actual AWS access key ID and secret access key, respectively. Remember to keep this file secure and never expose it publicly, as it contains sensitive information that grants access to your AWS resources.


## Node config

- `aws-importer`: Specifies configurations related to AWS importing process
  - `tag`: Used to identify the AWS resources you wish to observe. For example within an SCI score's 'application boundary'.
  - `location`: Specifies the AWS region where your resources are located.
  - `aws-observation`: Sets the observation period for AWS metrics in seconds. This defines how frequently metrics are collected and analyzed
  - `aws-services`: Specifies which AWS resource types to output observations from, currently ec2 or eb2.
- `metric`: Contains configurations related to metrics.
  - `cloudwatch-namespace`: Defines the namespace for CloudWatch metrics. The namespace is used to categorize metrics, making it easier to organize and manage them.
  - `client-namespace`: Specifies the namespace for the AWS EC2 client. This namespace is used to identify the AWS service to which the client belongs.

## Inputs

The plugin config enables the identification of resources by service type and tagging. Input parameters allow you to define the time and duration of your observation period. This section requires the following mandatory params:

- `timestamp`: Provide an ISO8601 `timestamp` representing the beginning of your observation period. By adding the `duration` to this initial `timestamp`, we determine the end time of your observation period.
- `duration`: Specify the `duration` of your observation period in seconds. This `duration` value is added to the `timestamp` to calculate the end time of your observation period.

All of these details are given as `inputs`. Additionally, you'll need to set up an instance of the `aws-importer` plugin to manage the specific `input` data for AWS. Below is an example of a fully configured manifest:

```yaml
name: aws-importer
description: example manifest utilizing the AWS plugin
tags: null
initialize:
  plugins:
    aws-importer:
      method: AwsImporter
      path: 'aws-importer'
      global-config:
        aws-importer:
          tag: 'GreenSoftware'
          location: eu-central-1
          aws-services: 'ec2, ebs'
          aws-observation: 60
        metric:
          cloudwatch-namespace: 'CloudwatchAgentMetrics'
          client-namespace: 'AWS/EC2'
  outputs: ['yaml']
tree:
  children:
    child:
      pipeline:
        - aws-importer
      inputs:
        - timestamp: '2024-03-26T14:08:00.000Z'
          duration: 3600
```

The input will grab AWS metrics for 3600 seconds (1 hour) period beginning at 14:08 UTC on 26th March 2024

Execute the following command from the project root to run the unit tests
```sh
npm run test
```

## Outputs

The AWS importer plugin will enrich the information in your `manifest`, resulting in the following output data:

- `timestamp`: the per-input `timestamp`
- `duration`: the per-input `duration` in seconds
- `location`: The AWS region, initially defined with the global or node config
- `geolocation`: LatLong of the resource's AWS region, based on Google geocoding for the region city
- `cloud/vendor`: The cloud vendor. For this plugin it will always be aws
- `cloud/service`: The AWS service associated with this resource, ie. ec2 or ebs
- `cloud/instance-type`: The name/sku of the AWS resource

For each result, there is aditional data. It can contains utilization or storage details:

- `memory/utilization`: percentage memory utilization
- `cpu/utilization`: percentage CPU utilization
Or:
- `storage/type`: storage type
- `storage/capacity`: storage capacity

For a one hour observation of a single EC2 VM and attached SSD storage, the output will look as follows:

```yaml
outputs:
  - timestamp: '2024-03-26T14:08:00.000Z'
    duration: 3600
    location: eu-central-1
    geolocation: 50.1213155,8.471759
    cloud/vendor: aws
    cloud/service: ec2
    cloud/instance-type: t2.micro
    memory/utilization: 0.6914698759172085
    cpu/utilization: 0.9272994995117188
  - timestamp: '2024-03-26T14:08:00.000Z'
    duration: 3600
    location: eu-central-1
    geolocation: 50.1213155,8.471759
    cloud/vendor: aws
    cloud/service: ebs
    storage/type: ssd
    storage/capacity: 8
```

## Error Handling
- The plugin conducts config validation using the zod library and will throw errors if required name/value pairs are missing.
- The plugin conducts input validation using the zod library and will throw errors if required parameters are missing, or the provided parameters are invalid.
- The plugin uses AWS credentials from .env vars. The AWS SDK will throw an error if the credentials are missing or invalid.


Executing the following command from the project root:

```sh
npm install

npm run build

npm link
```

Navigate to the folder with your manifest file and run the following:
```sh
npm link aws-importer
```

Go back to the root folder and run your manifest:
```sh
ie --manifest ./examples/aws-importer.yml --output ./examples/aws-importer-computed.yml
```

The results will be saved to a new `yaml` file in `./examples`.
