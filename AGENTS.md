# Repository guidance

Preserve upstream JSCAD signatures and native geometry outputs. Delegate unnamed
operations unchanged. References retain native geometry and full placement;
they are authored construction references, not persistent B-rep identifiers.

Keep the runtime browser-safe. Follow tscircuit/handbook bootstrapping guidance:
source installation, disabled lockfile, Bun test/typecheck/format workflows.
Each test file contains one test and one PoppyGL SVG snapshot. Numerical/error
assertions accompany the corresponding visual example.
