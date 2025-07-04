import { useState } from 'react';
import { Button } from './ui/button';

const TestErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error thrown by TestErrorComponent - this is intentional for testing Error Boundary');
  }

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-lg font-semibold mb-2">Error Boundary Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Click the button below to simulate an error and test the Error Boundary
      </p>
      <Button
        onClick={() => setShouldThrow(true)}
        variant="destructive"
      >
        Throw Test Error
      </Button>
    </div>
  );
};

export default TestErrorComponent;