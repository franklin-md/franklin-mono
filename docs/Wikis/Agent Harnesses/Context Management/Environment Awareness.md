## Failure Modes without sufficient environment context
- **Wrong Shell Syntax**:
- **Incorrect Path Conventions**:
	- Windows vs Posix slash directions are incompatable.
- **Failing to orient in the filesystem**:
	- Assumes certain folders exist purely based on understanding of the nature of the project (without ever inspecting)
	- **Guesses user home directory**
- **Time**:
	- Incorrectly certain on current date:
		- Fails to judge freshness of online material
	- Unaware of progress since knowledge cut-off
		- May use old versions of coding libraries (like Next.js 13 vs 15), thinking they are still the most up to date.
- **Permissions**:
	- Performs destructive operations (such as filesystem deletes or production mutation via a cli) **that are not restricted by an active sandbox**
	- Wastes failed tool calls attempting to perform operations that the sandbox prohibits.
### Recommended Context to Introduce:
Some of the above issues are due to lack of [[Agent Sandboxing]] creating true enforcement and relying optimistically on the system prompt to provide the guard rail. However, introducing the following can go a long way to resolve agent confusion:

- **Platform Name**:
	- Windows vs Linux etc
- **Current Shell**
	- Name
	- Shell Family
- **Directories**
	- Current Working Directory
	- Project roots
	- Home directory
- **Permissions**
- **Date**
- **Model**:
	- Name
	- Knowledge Cutoff

### Implementation Consideration
**Cache Performance vs Freshness Tradeoff**: Changing the system prompt prevents hitting the [[LLM Provider Cache]] on the start of the next turn. At the same time, some of the environment context is dynamic (cwd and time for example).