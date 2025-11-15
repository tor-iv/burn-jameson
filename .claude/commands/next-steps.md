Analyze the repository to identify the next steps by:

1. **Check git status** for uncommitted changes and modified files
2. **Search for TODO/FIXME comments** across the codebase
3. **Review CLAUDE.md and OVERVIEW.md** for project status and completion percentage
4. **Check for incomplete features** by examining:
   - API routes with error handling gaps
   - Missing environment variables in .env.example
   - Incomplete flows in the user journey
   - Database migrations that need to be run
5. **Identify critical bugs or issues** from recent commits
6. **Review testing gaps** - missing test files or low coverage areas
7. **Check documentation** - README updates needed, API docs missing

Provide a prioritized list of actionable next steps with:
- Priority level (Critical/High/Medium/Low)
- Estimated effort (Small/Medium/Large)
- Dependencies or blockers
- Specific file paths to work on

Format the output as a clear, actionable checklist.
