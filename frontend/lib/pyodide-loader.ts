let pyodideInstance: any = null;
let initPromise: Promise<any> | null = null;

export interface PyodideOutput {
  success: boolean;
  output?: string;
  error?: string;
}

/**
 * Packages pre-loaded at startup so every notebook gets the standard
 * scientific Python stack without an explicit import delay.
 *
 * Rationale (mirrors Kaggle / Google Colab defaults):
 *   numpy   — core numerical computing, dependency of everything else
 *   pandas  — DataFrame / Series, essential for any data work
 *   matplotlib — de-facto plotting library; includes pyplot
 *
 * scipy, scikit-learn, and Pillow are NOT pre-loaded because they are
 * large (30–60 MB each) and are auto-loaded on demand when the user's
 * code imports them (see detectAndLoadPackages).
 */
const PRELOAD_PACKAGES = ['numpy', 'pandas', 'matplotlib'];

/**
 * Maps common Python import names → Pyodide package identifiers.
 * Used by detectAndLoadPackages to auto-load missing packages before execution.
 */
const IMPORT_TO_PACKAGE: Record<string, string> = {
  numpy: 'numpy',
  np: 'numpy',
  pandas: 'pandas',
  pd: 'pandas',
  matplotlib: 'matplotlib',
  plt: 'matplotlib',
  scipy: 'scipy',
  sklearn: 'scikit-learn',
  PIL: 'Pillow',
  seaborn: 'seaborn',
  plotly: 'plotly',
  statsmodels: 'statsmodels',
};

/**
 * Load Pyodide WASM runtime with caching.
 * Singleton — safe to call from multiple components concurrently.
 */
export async function loadPyodideInstance(): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (typeof (window as any).loadPyodide === 'undefined') {
      throw new Error(
        'Pyodide failed to load. Check your internet connection or try reloading the page.'
      );
    }

    const instance = await (window as any).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.3/full/',
    });

    // Pre-load the standard scientific stack
    try {
      await instance.loadPackage(PRELOAD_PACKAGES);
    } catch (e) {
      console.warn('Failed to pre-load some Pyodide packages:', e);
    }

    pyodideInstance = instance;
    return pyodideInstance;
  })();

  try {
    return await initPromise;
  } finally {
    // Clear so a future call can retry if this one failed
    initPromise = null;
  }
}

/**
 * Inspect code for import statements and load any unrecognized packages
 * via Pyodide's micropip. Runs before each cell execution.
 *
 * Only loads packages not already in PRELOAD_PACKAGES.
 */
export async function detectAndLoadPackages(code: string, pyodide: any): Promise<void> {
  // Match: import foo, from foo import bar, import foo as f
  const importRe = /^\s*(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = importRe.exec(code)) !== null) {
    const name = match[1];
    const pkg = IMPORT_TO_PACKAGE[name];
    if (pkg && !PRELOAD_PACKAGES.includes(pkg) && !seen.has(pkg)) {
      seen.add(pkg);
    }
  }

  if (seen.size === 0) return;

  try {
    await pyodide.loadPackage([...seen]);
  } catch {
    // Some packages may require micropip (pure-Python wheels)
    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install(${JSON.stringify([...seen])})
`);
    } catch (e) {
      console.warn('Could not load packages via micropip:', e);
    }
  }
}

/**
 * Mount a file into Pyodide's virtual filesystem so notebook code can
 * read it with standard Python I/O (e.g. pd.read_csv('<filename>')).
 *
 * The file is written to /home/pyodide/<filename>, which is Pyodide's
 * default working directory, so relative paths just work.
 *
 * @param file   Browser File object (from <input type="file">)
 * @param pyodide Pyodide instance
 * @returns The path the file was written to (e.g. "/home/pyodide/sales.csv")
 */
export async function mountFileToFS(file: File, pyodide: any): Promise<string> {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const path = `/home/pyodide/${file.name}`;
  pyodide.FS.writeFile(path, uint8);
  return path;
}

/**
 * Remove a previously mounted file from Pyodide's FS.
 * Call this when the user detaches a dataset.
 */
export function unmountFileFromFS(filename: string, pyodide: any): void {
  try {
    pyodide.FS.unlink(`/home/pyodide/${filename}`);
  } catch {
    // File may not exist; ignore
  }
}

/**
 * Execute Python code in Pyodide and capture stdout/stderr.
 * Auto-loads any detected imports before running.
 */
export async function executePython(
  code: string,
  pyodide: any
): Promise<PyodideOutput> {
  if (!pyodide) {
    throw new Error('Pyodide not initialized');
  }

  // Auto-load packages the code imports (no-op for pre-loaded ones)
  await detectAndLoadPackages(code, pyodide);

  try {
    const stdout: string[] = [];
    const stderr: string[] = [];

    pyodide.setStdout({
      batched: (msg: string) => {
        stdout.push(msg);
      },
    });

    pyodide.setStderr({
      batched: (msg: string) => {
        stderr.push(msg);
      },
    });

    const result = await pyodide.runPythonAsync(code);

    let output: string | undefined;
    if (stdout.length > 0) {
      output = stdout.join('\n');
    } else if (result !== undefined && result !== null) {
      output = String(result);
    }

    // Surface stderr as a warning appended to output (not as an error)
    if (stderr.length > 0 && !output) {
      output = stderr.join('\n');
    }

    return { success: true, output };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Reset Pyodide namespace — clears all variables defined by previous cells.
 * Call between separate notebook "sessions" (e.g. Run All restarts).
 * NOT called between individual cells so state carries over naturally.
 */
export function resetPyodideState(pyodide: any): void {
  if (!pyodide) return;
  try {
    pyodide.runPython(`
import sys
# Remove user-defined globals but keep builtins and pre-loaded packages
_keep = {'__name__', '__doc__', '__package__', '__loader__', '__spec__',
         '__builtins__', '__build_class__'}
for _k in list(globals()):
    if _k not in _keep:
        del globals()[_k]
`);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Explicitly load matplotlib (kept for backwards compatibility).
 * With auto-detection this is rarely needed, but exposed for manual use.
 */
export async function loadMatplotlib(pyodide: any): Promise<void> {
  try {
    await pyodide.loadPackage(['matplotlib']);
  } catch (e) {
    console.warn('Failed to load matplotlib:', e);
  }
}
