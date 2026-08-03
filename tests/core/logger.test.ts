import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';

describe('Logger', () => {
  it('should format and log info messages', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger('TestContext');
    
    logger.info('Test message');
    
    expect(consoleSpy).toHaveBeenCalled();
    const loggedText = consoleSpy.mock.calls[0][0];
    expect(loggedText).toContain('[INFO]');
    expect(loggedText).toContain('[TestContext]');
    expect(loggedText).toContain('Test message');
    
    consoleSpy.mockRestore();
  });
});
