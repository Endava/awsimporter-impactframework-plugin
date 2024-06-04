import {getEC2Machines} from '../api/get-ec2-machines';
import {mockInputEC2Machines} from '../__mocks__';

jest.mock('@aws-sdk/client-ec2', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...originalModule,
    EC2Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation(() => {
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
});
