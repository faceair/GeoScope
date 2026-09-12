import "@testing-library/jest-dom";

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: async () => {},
  },
});
