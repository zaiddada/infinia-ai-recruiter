function sleep(ms: number) {
    return new Promise((r) =>
      setTimeout(r, ms)
    );
  }
  
  export async function retryInsert<T>(
    operation: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    let lastError: unknown;
  
    for (
      let attempt = 1;
      attempt <= retries;
      attempt++
    ) {
      try {
        return await Promise.race([
          operation(),
  
          new Promise<never>(
            (_, reject) =>
              setTimeout(() => {
                reject(
                  new Error(
                    "Supabase timeout"
                  )
                );
              }, 12000)
          ),
        ]);
      } catch (err) {
        lastError = err;
  
        console.error(
          "[supabase retry]",
          {
            attempt,
            err,
          }
        );
  
        if (attempt < retries) {
          await sleep(
            attempt * 1500
          );
        }
      }
    }
  
    throw lastError;
  }