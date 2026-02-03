import { CodeBlock } from '../../../../components/CodeSection/CodeSection'

export const gaulagSortCode: CodeBlock[] = [
  {
    title: 'TypeScript',
    code: `function gaulagSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  
  const gaulags: number[][] = [arr];
  
  // Separate unsorted elements into gaulags
  while (!isSorted(gaulags[gaulags.length - 1])) {
    const current = gaulags[gaulags.length - 1];
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
    
    gaulags[gaulags.length - 1] = sorted;
    gaulags.push(unsorted);
  }
  
  // Merge gaulags back together
  while (gaulags.length > 1) {
    const last = gaulags.pop()!;
    const second = gaulags.pop()!;
    gaulags.push(merge(second, last));
  }
  
  return gaulags[0];
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
    code: `function gaulagSort(arr) {
  if (arr.length <= 1) return arr;
  
  const gaulags = [arr];
  
  // Separate unsorted elements into gaulags
  while (!isSorted(gaulags[gaulags.length - 1])) {
    const current = gaulags[gaulags.length - 1];
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
    
    gaulags[gaulags.length - 1] = sorted;
    gaulags.push(unsorted);
  }
  
  // Merge gaulags back together
  while (gaulags.length > 1) {
    const last = gaulags.pop();
    const second = gaulags.pop();
    gaulags.push(merge(second, last));
  }
  
  return gaulags[0];
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
    code: `def gaulag_sort(arr):
    if len(arr) <= 1:
        return arr
    
    gaulags = [arr]
    
    # Separate unsorted elements into gaulags
    while not is_sorted(gaulags[-1]):
        current = gaulags[-1]
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
        
        gaulags[-1] = sorted_arr
        gaulags.append(unsorted)
    
    # Merge gaulags back together
    while len(gaulags) > 1:
        last = gaulags.pop()
        second = gaulags.pop()
        gaulags.append(merge(second, last))
    
    return gaulags[0]

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
