import { PermissionBoundary } from '@/components/permissions/PermissionBoundary';

// Component that throws an error to test the PermissionBoundary
const ErrorThrowingComponent = () => {
  throw new Error('Test permission error');
  return <div>This should not render</div>;
};

export const TestPermissionError = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Test Permission Error Boundary</h2>
      <PermissionBoundary>
        <ErrorThrowingComponent />
      </PermissionBoundary>
    </div>
  );
};
