// Math utility functions for KaTeX integration
export interface MathConfig {
  displayMode: boolean;
  throwOnError: boolean;
  strict: boolean;
  trust: boolean;
  macros: Record<string, string>;
}

export interface KaTeXInterface {
  render: (content: string, element: HTMLElement, config: MathConfig) => void;
  renderToString: (content: string, config: MathConfig) => string;
}

let katexLoadPromise: Promise<KaTeXInterface | null> | null = null;

export function getKaTeX(): Promise<KaTeXInterface | null> {
  if (katexLoadPromise) {
    return katexLoadPromise;
  }

  katexLoadPromise = new Promise((resolve) => {
    // Check if KaTeX is already available
    const globalKaTeX = (window as any).katex;
    if (globalKaTeX && typeof globalKaTeX.render === 'function') {
      resolve(globalKaTeX);
      return;
    }

    // Wait for KaTeX to load (with timeout)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds total
    const checkInterval = 100; // 100ms intervals

    const checkKaTeX = () => {
      const katex = (window as any).katex;
      if (katex && typeof katex.render === 'function') {
        resolve(katex);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('KaTeX failed to load within timeout');
        resolve(null);
        return;
      }

      setTimeout(checkKaTeX, checkInterval);
    };

    checkKaTeX();
  });

  return katexLoadPromise;
}

export function renderMath(
  content: string,
  element: HTMLElement,
  isBlock: boolean,
  katex?: KaTeXInterface | null
): boolean {
  if (!katex) {
    return false;
  }

  try {
    const config: MathConfig = {
      displayMode: isBlock,
      throwOnError: false,
      strict: false,
      trust: false,
      macros: {
        "\\RR": "\\mathbb{R}",
        "\\NN": "\\mathbb{N}",
        "\\ZZ": "\\mathbb{Z}",
        "\\QQ": "\\mathbb{Q}",
        "\\CC": "\\mathbb{C}",
        "\\eps": "\\varepsilon",
        "\\phi": "\\varphi",
      }
    };

    katex.render(content, element, config);
    return true;
  } catch (error) {
    console.warn('KaTeX rendering error:', error);
    return false;
  }
}

export function createFallbackElement(
  content: string,
  isBlock: boolean,
  isError = false
): HTMLElement {
  const element = document.createElement(isBlock ? "div" : "span");
  const delimiters = isBlock ? ['$$', '$$'] : ['$', '$'];
  
  element.textContent = `${delimiters[0]}${content}${delimiters[1]}`;
  element.className = isBlock ? "sb-math-block" : "sb-math-inline";
  
  if (isError) {
    element.classList.add('math-error');
  } else {
    element.classList.add('math-fallback');
  }
  
  return element;
}
