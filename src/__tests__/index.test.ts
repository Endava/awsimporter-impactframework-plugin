import {mockGlobalConfig, mockOutputResult} from '../__mocks__';
/* eslint-disable node/no-extraneous-import */
import {z, ZodError} from 'zod';
/* eslint-disable node/no-extraneous-import */
import {AwsImporter} from '../index';
import {globalConfigSchema, inputSchema} from '../utils/utils';

jest.mock('../index', () => {
  return {
    AwsImporter: jest.fn().mockImplementation(config => ({
      metadata: 'some metadata',
      execute: jest.fn((inputs: any) => {
        try {
          const inputsSchema = z.array(inputSchema);
          globalConfigSchema.parse(config);
          inputsSchema.parse(inputs);
          return Promise.resolve(mockOutputResult);
        } catch (error) {
          if (error instanceof ZodError) {
            return Promise.reject(error);
          } else {
            throw error;
          }
        }
      }),
    })),
  };
});

describe('libs/aws-importer', () => {
  describe('AWS Importer', () => {
    describe('init', () => {
      it('successfully initalized', () => {
        const awsImporter = AwsImporter(mockGlobalConfig);
        expect(awsImporter).toHaveProperty('metadata');
        expect(awsImporter).toHaveProperty('execute');
      });
    });

    describe('execute():', () => {
      it('returns a result with valid inputs.', async () => {
        const awsImporter = AwsImporter(mockGlobalConfig);
        const inputs = [
          {
            timestamp: '2024-03-26T14:08:00.000Z',
            duration: 3600,
          },
        ];

        const result = await awsImporter.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual(mockOutputResult);
      });
      it('returns an error for invalid input timestamp', async () => {
        const awsImporter = AwsImporter(mockGlobalConfig);

        const invalidInputs = [
          {
            timestamp: 'not-a-valid-timestamp',
            duration: 3600,
          },
        ];

        await expect(awsImporter.execute(invalidInputs)).rejects.toThrow(
          ZodError
        );

        await expect(awsImporter.execute(invalidInputs)).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'Invalid timestamp; must be a valid ISO date string'
            ),
          })
        );
      });
      it('returns an error for invalid missing globalconfig', async () => {
        const awsImporter = AwsImporter({});

        const invalidInputs = [
          {
            timestamp: '2024-03-26T14:08:00.000Z',
            duration: 3600,
          },
        ];

        await expect(awsImporter.execute(invalidInputs)).rejects.toThrow(
          ZodError
        );

        await expect(awsImporter.execute(invalidInputs)).rejects.toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'The aws-importer configuration is required.'
            ),
          })
        );
      });
    });
  });
});
