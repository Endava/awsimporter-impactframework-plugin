import {getEc2Volumes} from '../api/get-ec2-volumes';
import {mockInputVolumes} from '../__mocks__';

// Mock the EC2Client and DescribeVolumesCommand from AWS SDK
jest.mock('@aws-sdk/client-ec2', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...originalModule,
    EC2Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation(() => {
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
});
