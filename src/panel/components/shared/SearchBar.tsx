import { searchQuery } from '../../store'

export function SearchBar({ placeholder = 'Filter...' }: { placeholder?: string }) {
  return (
    <div class="toolbar">
      <input
        type="text"
        class="toolbar__search"
        placeholder={placeholder}
        value={searchQuery.value}
        onInput={(e) => { searchQuery.value = (e.target as HTMLInputElement).value }}
      />
      {searchQuery.value && (
        <button
          class="toolbar__btn"
          onClick={() => { searchQuery.value = '' }}
          title="Clear filter"
        >
          ✕
        </button>
      )}
    </div>
  )
}
