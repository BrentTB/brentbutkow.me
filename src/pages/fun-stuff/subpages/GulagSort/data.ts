import { CodeBlock } from '../../../../components/CodeSection/CodeSection'

export const gulagSortCode: CodeBlock[] = [
  {
    title: 'TypeScript',
    code: `function gulagSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  
  const gulags: number[][] = [arr];
  
  // Separate unsorted elements into gulags
  while (!isSorted(gulags[gulags.length - 1])) {
    const current = gulags[gulags.length - 1];
    const sorted: number[] = [];
    const unsorted: number[] = [];
    
    let prev = current[0];
    sorted.push(prev);
    
    for (let i = 1; i < current.length; i++) {
      if (current[i] < prev) {
        unsorted.push(current[i]);
      } else {
        sorted.push(current[i]);
        prev = current[i];
      }
    }
    
    gulags[gulags.length - 1] = sorted;
    gulags.push(unsorted);
  }
  
  // Merge gulags back together
  while (gulags.length > 1) {
    const last = gulags.pop()!;
    const second = gulags.pop()!;
    gulags.push(merge(second, last));
  }
  
  return gulags[0];
}

function isSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

function merge(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  
  return result.concat(a.slice(i)).concat(b.slice(j));
}`,
  },
  {
    title: 'JavaScript',
    code: `function gulagSort(arr) {
  if (arr.length <= 1) return arr;
  
  const gulags = [arr];
  
  // Separate unsorted elements into gulags
  while (!isSorted(gulags[gulags.length - 1])) {
    const current = gulags[gulags.length - 1];
    const sorted = [];
    const unsorted = [];
    
    let prev = current[0];
    sorted.push(prev);
    
    for (let i = 1; i < current.length; i++) {
      if (current[i] < prev) {
        unsorted.push(current[i]);
      } else {
        sorted.push(current[i]);
        prev = current[i];
      }
    }
    
    gulags[gulags.length - 1] = sorted;
    gulags.push(unsorted);
  }
  
  // Merge gulags back together
  while (gulags.length > 1) {
    const last = gulags.pop();
    const second = gulags.pop();
    gulags.push(merge(second, last));
  }
  
  return gulags[0];
}

function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

function merge(a, b) {
  const result = [];
  let i = 0, j = 0;
  
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i++]);
    } else {
      result.push(b[j++]);
    }
  }
  
  return result.concat(a.slice(i)).concat(b.slice(j));
}`,
  },
  {
    title: 'Python',
    code: `def gulag_sort(arr):
    if len(arr) <= 1:
        return arr
    
    gulags = [arr]
    
    # Separate unsorted elements into gulags
    while not is_sorted(gulags[-1]):
        current = gulags[-1]
        sorted_arr = []
        unsorted = []
        
        prev = current[0]
        sorted_arr.append(prev)
        
        for i in range(1, len(current)):
            if current[i] < prev:
                unsorted.append(current[i])
            else:
                sorted_arr.append(current[i])
                prev = current[i]
        
        gulags[-1] = sorted_arr
        gulags.append(unsorted)
    
    # Merge gulags back together
    while len(gulags) > 1:
        last = gulags.pop()
        second = gulags.pop()
        gulags.append(merge(second, last))
    
    return gulags[0]

def is_sorted(arr):
    for i in range(1, len(arr)):
        if arr[i] < arr[i - 1]:
            return False
    return True

def merge(a, b):
    result = []
    i, j = 0, 0
    
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i += 1
        else:
            result.append(b[j])
            j += 1
    
    return result + a[i:] + b[j:]`,
  },
]
