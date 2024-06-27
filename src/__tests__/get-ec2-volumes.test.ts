import {getEc2Volumes} from '../api/get-ec2-volumes';
import {mockInputVolumes} from '../__mocks__';

// Mock the EC2Client and DescribeVolumesCommand from AWS SDK
jest.mock('@aws-sdk/client-ec2', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...originalModule,
    EC2Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command) => {
        const volumeIds = command.input.VolumeIds;

        if (volumeIds && volumeIds.includes('no-volumes')) {
          return Promise.resolve({
            Volumes: undefined,
          });
        } else if (volumeIds && volumeIds.includes('unknown-type')) {
          return Promise.resolve({
            Volumes: [
              {
                VolumeType: 'unknown',
                Size: 200,
              },
            ],
          });
        } else {
          return Promise.resolve({
            Volumes: [
              {
                VolumeType: 'gp3',
                Size: 100,
              },
              {
                VolumeType: 'sc1',
                Size: 500,
              },
            ],
          });
        }
      }),
    })),
  };
});

describe('getEc2Volumes', () => {
  it('returns mapped volumes data including SSD and HDD types', async () => {
    const expectedOutput = [
      {
        'storage/type': 'ssd',
        'storage/capacity': 100,
      },
      {
        'storage/type': 'hdd',
        'storage/capacity': 500,
      },
    ];

    const result = await getEc2Volumes(mockInputVolumes);
    expect(result).toEqual(expectedOutput);
  });

  it('returns undefined when response.Volumes is undefined', async () => {
    const input = {
      ...mockInputVolumes,
      volumeIds: ['no-volumes'],
    };

    const result = await getEc2Volumes(input);
    expect(result).toBeUndefined();
  });

  it('handles unknown VolumeType by setting storageType to undefined', async () => {
    const input = {
      ...mockInputVolumes,
      volumeIds: ['unknown-type'],
    };

    const expectedOutput = [
      {
        'storage/type': undefined,
        'storage/capacity': 200,
      },
    ];

    const result = await getEc2Volumes(input);
    expect(result).toEqual(expectedOutput);
  });
});
