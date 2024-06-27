import {getEC2Machines} from '../api/get-ec2-machines';
import {mockInputEC2Machines} from '../__mocks__';
import {DescribeInstancesCommandInput} from '@aws-sdk/client-ec2';

jest.mock('@aws-sdk/client-ec2', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...originalModule,
    EC2Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command: { input: DescribeInstancesCommandInput }) => {
        const tagFilter = command.input.Filters?.find((filter) => filter.Name === 'tag:Project');
        const tagValue = tagFilter?.Values?.[0] ?? '';

        if (tagValue === 'no-reservations') {
          return Promise.resolve({
            Reservations: undefined,
          });
        } else if (tagValue === 'no-instances') {
          return Promise.resolve({
            Reservations: [
              {
                Instances: undefined,
              },
            ],
          });
        } else if (tagValue === 'no-block-devices') {
          return Promise.resolve({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-1234567890abcdef0',
                    ImageId: 'ami-05d72852800cbf29e',
                    InstanceType: 't2.micro',
                    RootDeviceName: '/dev/sda1',
                    BlockDeviceMappings: undefined,
                  },
                ],
              },
            ],
          });
        } else if (tagValue === 'empty-block-devices') {
          return Promise.resolve({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-1234567890abcdef0',
                    ImageId: 'ami-05d72852800cbf29e',
                    InstanceType: 't2.micro',
                    RootDeviceName: '/dev/sda1',
                    BlockDeviceMappings: [],
                  },
                ],
              },
            ],
          });
        } else if (tagValue === 'mixed-block-devices') {
          return Promise.resolve({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-1234567890abcdef0',
                    ImageId: 'ami-05d72852800cbf29e',
                    InstanceType: 't2.micro',
                    RootDeviceName: '/dev/sda1',
                    BlockDeviceMappings: [
                      {
                        DeviceName: '/dev/sda1',
                        Ebs: {
                          VolumeId: 'vol-01c4a06424ff37c90',
                        },
                      },
                    ],
                  },
                  {
                    InstanceId: 'i-0987654321fedcba0',
                    ImageId: 'ami-1234567890abcdef0',
                    InstanceType: 't2.medium',
                    RootDeviceName: '/dev/sda2',
                    BlockDeviceMappings: undefined,
                  },
                ],
              },
            ],
          });
        } else if (tagValue === 'various-properties') {
          return Promise.resolve({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-11111111111111111',
                    ImageId: 'ami-11111111111111111',
                    InstanceType: 't2.large',
                    RootDeviceName: '/dev/sdb1',
                    BlockDeviceMappings: [
                      {
                        DeviceName: '/dev/sdb1',
                        Ebs: {
                          VolumeId: 'vol-11111111111111111',
                        },
                      },
                    ],
                  },
                  {
                    InstanceId: undefined,
                    ImageId: undefined,
                    InstanceType: undefined,
                    RootDeviceName: undefined,
                    BlockDeviceMappings: undefined,
                  },
                ],
              },
            ],
          });
        } else {
          return Promise.resolve({
            Reservations: [
              {
                Instances: [
                  {
                    InstanceId: 'i-1234567890abcdef0',
                    ImageId: 'ami-05d72852800cbf29e',
                    InstanceType: 't2.micro',
                    RootDeviceName: '/dev/sda1',
                    BlockDeviceMappings: [
                      {
                        DeviceName: '/dev/sda1',
                        Ebs: {
                          VolumeId: 'vol-01c4a06424ff37c90',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          });
        }
      }),
    })),
  };
});

describe('getEC2Machines', () => {
  it('returns a list of formatted EC2 machines', async () => {
    const expectedOutput = [
      {
        InstanceId: 'i-1234567890abcdef0',
        ImageId: 'ami-05d72852800cbf29e',
        InstanceType: 't2.micro',
        RootDeviceName: '/dev/sda1',
        BlockDevices: [
          {
            DeviceName: '/dev/sda1',
            VolumeId: 'vol-01c4a06424ff37c90',
          },
        ],
      },
    ];

    const result = await getEC2Machines(mockInputEC2Machines);
    expect(result).toEqual(expectedOutput);
  });

  it('returns an empty array when Reservations is undefined', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'no-reservations',
    };

    const result = await getEC2Machines(input);
    expect(result).toEqual([]);
  });

  it('returns an empty array when Instances is undefined', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'no-instances',
    };

    const result = await getEC2Machines(input);
    expect(result).toEqual([]);
  });

  it('returns instances with undefined BlockDevices when BlockDeviceMappings is undefined', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'no-block-devices',
    };

    const expectedOutput = [
      {
        InstanceId: 'i-1234567890abcdef0',
        ImageId: 'ami-05d72852800cbf29e',
        InstanceType: 't2.micro',
        RootDeviceName: '/dev/sda1',
        BlockDevices: undefined,
      },
    ];

    const result = await getEC2Machines(input);
    expect(result).toEqual(expectedOutput);
  });

  it('returns instances with empty BlockDevices array when BlockDeviceMappings is an empty array', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'empty-block-devices',
    };

    const expectedOutput = [
      {
        InstanceId: 'i-1234567890abcdef0',
        ImageId: 'ami-05d72852800cbf29e',
        InstanceType: 't2.micro',
        RootDeviceName: '/dev/sda1',
        BlockDevices: [],
      },
    ];

    const result = await getEC2Machines(input);
    expect(result).toEqual(expectedOutput);
  });

  it('returns a mix of instances with and without BlockDevices', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'mixed-block-devices',
    };

    const expectedOutput = [
      {
        InstanceId: 'i-1234567890abcdef0',
        ImageId: 'ami-05d72852800cbf29e',
        InstanceType: 't2.micro',
        RootDeviceName: '/dev/sda1',
        BlockDevices: [
          {
            DeviceName: '/dev/sda1',
            VolumeId: 'vol-01c4a06424ff37c90',
          },
        ],
      },
      {
        InstanceId: 'i-0987654321fedcba0',
        ImageId: 'ami-1234567890abcdef0',
        InstanceType: 't2.medium',
        RootDeviceName: '/dev/sda2',
        BlockDevices: undefined,
      },
    ];

    const result = await getEC2Machines(input);
    expect(result).toEqual(expectedOutput);
  });

  it('returns instances with various combinations of defined and undefined properties', async () => {
    const input = {
      ...mockInputEC2Machines,
      tag: 'various-properties',
    };

    const expectedOutput = [
      {
        InstanceId: 'i-11111111111111111',
        ImageId: 'ami-11111111111111111',
        InstanceType: 't2.large',
        RootDeviceName: '/dev/sdb1',
        BlockDevices: [
          {
            DeviceName: '/dev/sdb1',
            VolumeId: 'vol-11111111111111111',
          },
        ],
      },
      {
        InstanceId: '',
        ImageId: '',
        InstanceType: undefined,
        RootDeviceName: '',
        BlockDevices: undefined,
      },
    ];

    const result = await getEC2Machines(input);
    expect(result).toEqual(expectedOutput);
  });
});
