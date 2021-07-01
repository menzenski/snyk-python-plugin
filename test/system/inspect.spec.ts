import { inspect } from '../../lib';
import { chdirWorkspaces } from '../test-utils';
import { DepGraphBuilder } from '@snyk/dep-graph';
import { FILENAMES } from '../../lib/types';
import * as subProcess from '../../lib/dependencies/sub-process';
import { SpawnSyncReturns } from 'child_process';

// TODO: jestify tap tests in ./inspect.test.js here
describe('inspect', () => {
  const originalCurrentWorkingDirectory = process.cwd();

  afterEach(() => {
    process.chdir(originalCurrentWorkingDirectory);
  });

  describe('poetry projects', () => {
    it('should return expected dependencies for poetry-app', async () => {
      const workspace = 'poetry-app';
      chdirWorkspaces(workspace);

      const result = await inspect('.', FILENAMES.poetry.lockfile);
      expect(result).toMatchObject({
        plugin: {
          name: 'snyk-python-plugin',
          runtime: expect.any(String), // any version of Python
          targetFile: FILENAMES.poetry.manifest,
        },
        package: null, // no dep-tree
        dependencyGraph: {}, // match any dep-graph (equality checked below)
      });

      const builder = new DepGraphBuilder(
        { name: 'poetry' },
        { name: 'poetry-fixtures-project', version: '0.1.0' }
      );
      const expected = builder
        .addPkgNode({ name: 'jinja2', version: '2.11.2' }, 'jinja2')
        .connectDep(builder.rootNodeId, 'jinja2')
        .addPkgNode({ name: 'markupsafe', version: '1.1.1' }, 'markupsafe')
        .connectDep('jinja2', 'markupsafe')
        .build();

      expect(result.dependencyGraph).toEqualDepGraph(expected);
    });
  });

  it('should return correct target file for poetry project when relative path to poetry lock file is passed', async () => {
    const dirname = 'test/fixtures/poetry-project';
    const manifestFilePath = `${dirname}/poetry.lock`;

    const result = await inspect('.', manifestFilePath);

    const expectedTargetFile = `${dirname}/pyproject.toml`;
    expect(result.plugin.targetFile).toEqual(expectedTargetFile);
  });

  describe('Pipfile projects', () => {
    const mockedExecuteSync = jest.spyOn(subProcess, 'executeSync');
    const mockedExecute = jest.spyOn(subProcess, 'execute');

    afterEach(() => {
      mockedExecuteSync.mockClear();
      mockedExecute.mockClear();
    });

    it('should return correct target file for pipenv project when relative path to pipfile lock file is passed', async () => {
      mockedExecuteSync.mockReturnValueOnce({
        status: 0,
      } as SpawnSyncReturns<Buffer>);
      mockedExecute.mockResolvedValueOnce('Python 3.9.5');
      mockedExecute.mockResolvedValueOnce(
        '{"name": "pipenv-app", "version": "0.0.0", "dependencies": {"jinja2": {"name": "jinja2", "version": "3.0.1", "dependencies": {"MarkupSafe": {"name": "markupsafe", "version": "2.0.1"}}}}, "packageFormatVersion": "pip:0.0.1"}'
      );
      const dirname = 'test/fixtures/pipenv-project';
      const manifestFilePath = `${dirname}/Pipfile`;
      const result = await inspect('.', manifestFilePath);
      const expectedTargetFile = `${dirname}/Pipfile`;
      expect(result.plugin.targetFile).toEqual(expectedTargetFile);
    });
  });

  describe('setup.py projects', () => {
    const mockedExecuteSync = jest.spyOn(subProcess, 'executeSync');
    const mockedExecute = jest.spyOn(subProcess, 'execute');

    afterEach(() => {
      mockedExecuteSync.mockClear();
      mockedExecute.mockClear();
    });

    it('should return correct target file for setuptools project when relative path to setup lock file is passed', async () => {
      mockedExecute.mockResolvedValueOnce('Python 3.9.5');
      mockedExecute.mockResolvedValueOnce(
        '{"name": "pipenv-app", "version": "0.0.0", "dependencies": {"jinja2": {"name": "jinja2", "version": "3.0.1", "dependencies": {"MarkupSafe": {"name": "markupsafe", "version": "2.0.1"}}}}, "packageFormatVersion": "pip:0.0.1"}'
      );
      const dirname = 'test/fixtures/setuptools-project';
      const manifestFilePath = `${dirname}/setup.py`;
      const result = await inspect('.', manifestFilePath);
      const expectedTargetFile = `${dirname}/setup.py`;
      expect(result.plugin.targetFile).toEqual(expectedTargetFile);
    });
  });
});
