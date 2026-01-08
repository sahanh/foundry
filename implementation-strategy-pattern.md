# Strategy Pattern

When to recognize and apply the Strategy pattern during implementation.

---

## The Smell

You're about to write (or have written) branching logic like this:

```
if (type === 'A') {
    // 20 lines of business logic for A
} else if (type === 'B') {
    // 25 lines of business logic for B
} else if (type === 'C') {
    // 30 lines of business logic for C
}
```

### Why This Is a Problem

1. **Hard to test** — To test type B logic, you need to set up the entire context and route through the conditional. Each branch is entangled with the branching structure.

2. **Hard to read** — The method grows long. The reader must parse the branching to understand what each type does.

3. **Hard to extend** — Adding type D means modifying this method, increasing its complexity further.

4. **Violation of single responsibility** — One method knows how to handle every type.

---

## The Trigger

Apply Strategy pattern when you observe:

- **Multiple branches** with distinct business logic (not just simple value assignments)
- **Each branch is substantial** — more than a few lines of logic
- **The branching is based on type/category** — a value that determines which logic to execute
- **You anticipate growth** — more types may be added

---

## The Solution

Extract each branch into its own class. Define a common interface. Use a factory to select the right implementation.

### Structure

```
Interface (contract)
    ↑
    ├── ImplementationA
    ├── ImplementationB
    └── ImplementationC

Factory → selects implementation based on type
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **Testability** | Each implementation is tested in isolation |
| **Readability** | Each class has a single, focused responsibility |
| **Extensibility** | Add new types by adding new classes, not modifying existing code |
| **Discoverability** | The interface documents what each strategy must do |

---

## Implementation Steps

1. **Define the interface** — What methods must each strategy implement? What inputs do they receive? What do they return?

2. **Extract each branch** — Move the logic from each if-else block into a class that implements the interface.

3. **Create a factory** — A method or class that takes the type/category and returns the correct implementation.

4. **Replace the conditional** — Instead of branching, get the strategy from the factory and call its method.

### Before

```
function evaluate(field, agent) {
    if (field.type === 'multiselect') {
        // multiselect evaluation logic
    } else if (field.type === 'timezone') {
        // timezone evaluation logic
    } else if (field.type === 'weight') {
        // weight evaluation logic
    }
}
```

### After

```
function evaluate(field, agent) {
    const evaluator = factory.getEvaluator(field.type);
    return evaluator.evaluate(field, agent);
}
```

Each evaluator class contains only its own logic and can be tested independently.

---

## When NOT to Use Strategy

- **Simple value mapping** — If branches just return different values without logic, a lookup table or map is simpler.
- **Two branches with trivial logic** — Overhead of classes may not be justified.
- **One-off conditional** — If this branching appears only once and won't grow, a simple conditional may be fine.

The goal is maintainability. Apply Strategy when it genuinely simplifies testing and extension.
