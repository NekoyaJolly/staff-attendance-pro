/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

// QR Scanner type definitions
declare module 'qr-scanner' {
  interface QrScannerOptions {
    highlightScanRegion?: boolean
    highlightCodeOutline?: boolean
    returnDetailedScanResult?: boolean
    preferredCamera?: 'user' | 'environment'
  }

  interface ScanResult {
    data: string
    cornerPoints: Array<{ x: number; y: number }>
  }

  class QrScanner {
    constructor(
      video: HTMLVideoElement,
      onDecode: (result: ScanResult) => void,
      options?: QrScannerOptions
    )
    
    start(): Promise<void>
    stop(): Promise<void>
    destroy(): void
    
    static hasCamera(): Promise<boolean>
  }

  export = QrScanner
}