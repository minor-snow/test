# Example Architecture Notes

This system is divided into three primary domains:
1. **Engine**: Responsible for the heavy lifting of governance logic.
2. **API**: The entry point for all commands.
3. **Storage**: The source of truth for all persistent state.

Dependencies should flow from **API** -> **Engine** -> **Storage**. Any reverse dependency (e.g., Storage calling API) is considered a violation.
