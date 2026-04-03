import { loadPyodide } from 'pyodide';

let pyodideInstance: any = null;
let initPromise: Promise<any> | null = null;

export interface PyodideOutput {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Load Pyodide WASM runtime with caching
 * Uses singleton pattern to avoid multiple loads
 */
export async function loadPyodideInstance(): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.3/full/',
    });

    // Capture stdout/stderr for output display
    pyodideInstance.setStdout({
      batched: (msg: string) => console.log('Python stdout:', msg),
    });
    pyodideInstance.setStderr({
      batched: (msg: string) => console.error('Python stderr:', msg),
    });

    // Pre-load common data science packages
    // Load numpy first as pandas depends on it
    try {
      await pyodideInstance.loadPackage(['numpy']);
    } catch (e) {
      console.warn('Failed to load numpy:', e);
    }

    return pyodideInstance;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Execute Python code in Pyodide
 * Returns output string or error message
 */
export async function executePython(
  code: string,
  pyodide: any
): Promise<PyodideOutput> {
  if (!pyodide) {
    throw new Error('Pyodide not initialized');
  }

  try {
    const result = await pyodide.runPythonAsync(code);
    return {
      success: true,
      output: result !== undefined ? String(result) : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Reset Pyodide state (clear globals, etc.)
 * Call this between notebook executions to prevent state bleeding
 */
export function resetPyodideState(pyodide: any): void {
  if (!pyodide) return;
  // Clear variables from previous execution
  try {
    pyodide.runPython('for name in list(globals()): del globals()[name]');
  } catch (e) {
    // Ignore errors during cleanup
  }
}

/**
 * Load matplotlib package on demand (heavy, so load only when needed)
 */
export async function loadMatplotlib(pyodide: any): Promise<void> {
  try {
    await pyodide.loadPackage(['matplotlib']);
  } catch (e) {
    console.warn('Failed to load matplotlib:', e);
  }
}
