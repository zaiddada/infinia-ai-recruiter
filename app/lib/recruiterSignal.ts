export type RecruiterSignal = {
    strongSignals: string[];
    weakSignals: string[];
    followUps: string[];
  };
  
  export function extractRecruiterSignals(
    text: string
  ): RecruiterSignal {
    const lower =
      text.toLowerCase();
  
    const strongSignals: string[] = [];
    const weakSignals: string[] = [];
    const followUps: string[] = [];
  
    if (
      lower.includes("react") ||
      lower.includes("next.js")
    ) {
      strongSignals.push(
        "Frontend development exposure"
      );
  
      followUps.push(
        "Ask about architecture decisions."
      );
    }
  
    if (
      lower.includes("team") ||
      lower.includes("collaboration")
    ) {
      strongSignals.push(
        "Collaboration awareness"
      );
    }
  
    if (
      lower.includes("i don't know") ||
      lower.includes("not sure")
    ) {
      weakSignals.push(
        "Low confidence response"
      );
  
      followUps.push(
        "Probe depth carefully."
      );
    }
  
    if (
      text.split(" ").length < 12
    ) {
      weakSignals.push(
        "Very short answer"
      );
  
      followUps.push(
        "Ask candidate to elaborate."
      );
    }
  
    return {
      strongSignals,
      weakSignals,
      followUps,
    };
  }