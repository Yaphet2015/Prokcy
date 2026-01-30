import { useNetwork } from '../../shared/context';

export default function Network() {
  const { requests } = useNetwork();

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <p className="text-tahoe-subtle mb-2">Network capture coming soon...</p>
        <p className="text-xs text-tahoe-border">
          Requests: {requests.length}
        </p>
      </div>
    </div>
  );
}
