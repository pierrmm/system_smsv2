export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-56 bg-gray-200 dark:bg-gray-800 rounded" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
      ))}
    </div>
  );
}

