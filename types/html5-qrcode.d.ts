declare module 'html5-qrcode' {
  class Html5QrcodeScanner {
    constructor(elementId: string, config?: any, verbose?: boolean);
    render(success: (decodedText: string) => void, error: (error: any) => void): void;
    clear(): void;
    pause(): void;
    resume(): void;
  }
  export { Html5QrcodeScanner };
}
