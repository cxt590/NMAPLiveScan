import { useState, useCallback, useRef } from "react";

export function useAnalytics() {
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [rawStream,   setRawStream]     = useState("");   // streamed text as it arrives
  const [analysis,    setAnalysis]      = useState(null); // parsed JSON when complete
  const [error,       setError]         = useState(null);
  const abortRef = useRef(null);

  const analyze = useCallback(async (scanResults) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setRawStream("");
    setAnalysis(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(scanResults),
        signal:  controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";
      let   fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta  = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              fullText += delta;
              setRawStream(fullText);
            }
            // Check for error object
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            if (e.message !== "Unexpected end of JSON input") {
              // Ignore partial JSON chunks, only throw real errors
              if (parsed?.error) throw e;
            }
          }
        }
      }

      // Extract JSON block from the response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          setAnalysis(JSON.parse(jsonMatch[0]));
        } catch {
          setError("Copilot returned malformed JSON. Raw output shown below.");
        }
      } else {
        setError("No structured JSON found in response. Raw output shown below.");
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, []);

  const reset = useCallback(() => {
    setRawStream("");
    setAnalysis(null);
    setError(null);
  }, []);

  return { isAnalyzing, rawStream, analysis, error, analyze, cancel, reset };
}