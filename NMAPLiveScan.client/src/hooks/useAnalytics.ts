import { useState, useCallback, useRef } from "react";
import type { Analysis, NmapResults } from "../types";

interface StreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  error?: string;
}

export function useAnalytics() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawStream, setRawStream] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (scanResults: NmapResults) => {
      if (isAnalyzing) return;
      setIsAnalyzing(true);
      setRawStream("");
      setAnalysis(null);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scanResults),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

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
              const parsed = JSON.parse(data) as StreamChunk;
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                fullText += delta;
                setRawStream(fullText);
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                // Only re-throw genuine errors, not partial-JSON parse failures
                const parsed = (() => {
                  try {
                    return JSON.parse(data) as StreamChunk;
                  } catch {
                    return null;
                  }
                })();
                if (parsed?.error) throw e;
              }
            }
          }
        }

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            setAnalysis(JSON.parse(jsonMatch[0]) as Analysis);
          } catch {
            setError("Copilot returned malformed JSON. Raw output shown below.");
          }
        } else {
          setError("No structured JSON found in response. Raw output shown below.");
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setError(e.message);
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isAnalyzing]
  );

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
