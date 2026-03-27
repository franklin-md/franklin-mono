# Before PR/Merge

- Ensure no-dead code paths:
  -  Dead if not exported from package and not consumed within package other than tests
  -  Not dead if exported from package, but PR must mention change to package API. Less important for core code packages, but very important for top-level sdks like `agent`