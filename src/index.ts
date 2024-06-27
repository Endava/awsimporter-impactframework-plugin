import {PluginInterface, PluginParams} from './interfaces';
import {AWSCredentials, YourGlobalConfig} from './types';
/* eslint-disable node/no-extraneous-import */
import * as dotenv from 'dotenv';

import {getEC2Machines} from './api/get-ec2-machines';
import {
  getFinalData,
  getGeolocation,
  getVolumeIds,
  globalConfigSchema,
  inputSchema,
} from './utils/utils';
import {getEc2Volumes} from './api/get-ec2-volumes';
import {getCloudWatchData} from './api/get-cloudwatch-data';
import {z, ZodError} from 'zod';

/* eslint-disable node/no-extraneous-import */
export const AwsImporter = (
  globalConfig: YourGlobalConfig
): PluginInterface => {
  const metadata = {
    kind: 'execute',
  };

  /**
   * Execute's strategy description here.
   */
  const execute = async (
    inputs: PluginParams[],
    config: any
  ): Promise<PluginParams[]> => {
    /**
     * Validations
     */

    const inputsSchema = z.array(inputSchema);

    /**
     * Override global config if child service config exists
     */
    if (config && config['aws-services']) {
      globalConfig['aws-importer'] = {
        ...globalConfig['aws-importer'],
        'aws-services': config['aws-services'],
      };
    }

    try {
      globalConfigSchema.parse(globalConfig);
      inputsSchema.parse(inputs);
    } catch (error) {
      if (error instanceof ZodError) {
        error.errors.map(e => {
          throw new Error(e.message);
        });
      } else {
        throw error;
      }
    }

    dotenv.config();

    const {tag} = globalConfig['aws-importer'];
    const {location: region} = globalConfig['aws-importer'];

    const credentials: AWSCredentials = {
      accessKeyId: String(process.env.AWS_ACCESS_KEY_ID),
      secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
    };

    /**
     * Async function to get EC2 Machines based on the tag and region
     */
    const instances = await getEC2Machines({region, credentials, tag});

    /**
     * Filters the BlockDevices from each instance and creates an array of volume IDs used to receive the EC2 Volumes
     */
    const volumeIds = getVolumeIds(instances);

    /**
     * Async function to get EC2 Volumes based on the tag, region and specific volumes IDs
     */
    const volumesData = await getEc2Volumes({
      tag,
      region,
      volumeIds,
      credentials,
    });

    const outputs = inputs.map(async input => {
      const cloudWatchData = await getCloudWatchData(
        input,
        globalConfig,
        instances,
        region,
        credentials
      );

      const allCloudWatchData = cloudWatchData.groupedItemsArray.map(value => {
        return {
          ...input,
          location: region,
          geolocation: getGeolocation(region),
          'cloud/vendor': 'aws',
          'cloud/service': 'ec2',
          'cloud/instance-type': cloudWatchData.instanceTypes[0],
          ...value,
        };
      });

      const diskData = volumesData?.flatMap(value => {
        return {
          ...input,
          location: region,
          geolocation: getGeolocation(region),
          'cloud/vendor': 'aws',
          'cloud/service': 'ebs',
          ...value,
        };
      });

      const awsService: string[] =
        globalConfig['aws-importer']['aws-services'].split(', ');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // We're using the aws-services to determine the output data if it will contain based on the ec2, ebs or both
      return getFinalData(awsService, allCloudWatchData, diskData);
    });

    const resolvedOutputs = await Promise.all(outputs);
    return resolvedOutputs.flat();
  };

  return {
    metadata,
    execute,
  };
};
