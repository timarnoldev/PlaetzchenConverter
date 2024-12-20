// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

export type MergedOutputs = {stdout?: string, stderr?: string, error?: string}[];

export function createWasmMemory({maximumMegabytes, maximumBytes}: {maximumMegabytes: number, maximumBytes: number}) {
  const pageSize = 64 * 1024; // 64KB
  if (!maximumBytes) {
    maximumBytes = maximumMegabytes * 1024 * 1024;
  }
  return new WebAssembly.Memory({
    initial: Math.floor(maximumBytes / 2 / pageSize),
    maximum: Math.floor(maximumBytes / pageSize),
    shared: true,
  });
}

// Output is {outputs: [name, content][], mergedOutputs: [{(stderr|stdout|error)?: string}], exitCode: number}
export type OpenSCADInvocation = {
  wasmMemory?: WebAssembly.Memory,
  // workingDir: string,
  inputs?: [string, string][],
  args: string[],
  outputPaths?: string[],
  svgFile?: string,
}
export type OpenSCADInvocationResults = {
  exitCode: number,
  error?: string,
  outputs?: [string, string][],
  mergedOutputs: MergedOutputs,
  elapsedMillis: number,
}

export function spawnOpenSCAD(invocation: OpenSCADInvocation): Promise<OpenSCADInvocationResults> {
  var worker: Worker | null;
  var rejection: (err: any) => void;

  function terminate() {
    if (!worker) {
      return;
    }
    worker.terminate();
    worker = null;
  }
    
  return new Promise<OpenSCADInvocationResults>((resolve, reject) => {
    console.log("creating worker");

    worker = new Worker('./openscad-worker.js');//, {type: "module"})
    // if (navigator.userAgent.indexOf(' Chrome/') < 0) {
    //   worker = new Worker('./openscad-worker-firefox.js'); // {'type': 'module'}
    // } else {
    //   worker = new Worker('./openscad-worker.js', {'type': 'module'});
    // }
    rejection = reject;
    worker.onmessage = (e: {data: OpenSCADInvocationResults}) => {
      resolve(e.data);
      terminate();
    }
    worker.postMessage(invocation)
    
    return () => {
      // rejection({error: 'Terminated'});
      terminate();
    };
  });
}
