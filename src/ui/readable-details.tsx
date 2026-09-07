import { isRecord, readableLabel, readableValue } from '../pages/audit-format'
export function ReadableDetails({ value }: { value: Record<string, unknown> }) {
  return (
    <dl className="audit-facts">
      {Object.entries(value).map(([key, item]) => (
        <div key={key}>
          <dt>{readableLabel(key)}</dt>
          <dd>
            {isRecord(item) ? (
              <ReadableDetails value={item} />
            ) : Array.isArray(item) ? (
              <ul>
                {item.map((entry, index) => (
                  <li key={index}>
                    {isRecord(entry) ? (
                      <ReadableDetails value={entry} />
                    ) : (
                      readableValue(key, entry)
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              readableValue(key, item)
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
