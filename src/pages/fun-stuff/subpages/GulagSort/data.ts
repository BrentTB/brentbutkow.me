import { CodeBlock } from '../../../../components/CodeSection/CodeSection'

export const gulagSortCode: CodeBlock[] = [
  {
    title: 'TypeScript',
    code: `function isSorted(arr: number[]): boolean {
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
}

function gulagSort(arr: number[]): number[] {
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
}`,
  },
  {
    title: 'JavaScript',
    code: `function isSorted(arr) {
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
}

function gulagSort(arr) {
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
}`,
  },
  {
    title: 'C++',
    code: `#include <vector>

bool isSorted(const std::vector<int>& arr) {
    for (size_t i = 1; i < arr.size(); ++i) {
        if (arr[i] < arr[i - 1]) return false;
    }
    return true;
}

std::vector<int> merge(const std::vector<int>& a, const std::vector<int>& b) {
    std::vector<int> result;
    size_t i = 0, j = 0;
    
    while (i < a.size() && j < b.size()) {
        if (a[i] <= b[j]) {
            result.push_back(a[i++]);
        } else {
            result.push_back(b[j++]);
        }
    }
    
    while (i < a.size()) {
        result.push_back(a[i++]);
    }
    
    while (j < b.size()) {
        result.push_back(b[j++]);
    }
    
    return result;
}

std::vector<int> gulagSort(const std::vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    
    std::vector<std::vector<int>> gulags = {arr};
    
    // Separate unsorted elements into gulags
    while (!isSorted(gulags.back())) {
        const auto& current = gulags.back();
        std::vector<int> sorted;
        std::vector<int> unsorted;
        
        int prev = current[0];
        sorted.push_back(prev);
        
        for (size_t i = 1; i < current.size(); ++i) {
            if (current[i] < prev) {
                unsorted.push_back(current[i]);
            } else {
                sorted.push_back(current[i]);
                prev = current[i];
            }
        }
        
        gulags.back() = sorted;
        gulags.push_back(unsorted);
    }
    
    // Merge gulags back together
    while (gulags.size() > 1) {
        auto last = gulags.back(); gulags.pop_back();
        auto second = gulags.back(); gulags.pop_back();
        gulags.push_back(merge(second, last));
    }
    
    return gulags.front();
}`,
  },
  {
    title: 'Python',
    code: `def is_sorted(arr):
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
    
    return result + a[i:] + b[j:]

def gulag_sort(arr):
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
    
    return gulags[0]`,
  },
  {
    title: 'Java',
    code: `import java.util.ArrayList;
import java.util.List;

private static boolean isSorted(List<Integer> arr) {
    for (int i = 1; i < arr.size(); i++) {
        if (arr.get(i) < arr.get(i - 1)) return false;
    }
    return true;
}

private static List<Integer> merge(List<Integer> a, List<Integer> b) {
    List<Integer> result = new ArrayList<>();
    int i = 0, j = 0;
    
    while (i < a.size() && j < b.size()) {
        if (a.get(i) <= b.get(j)) {
            result.add(a.get(i++));
        } else {
            result.add(b.get(j++));
        }
    }
    
    while (i < a.size()) {
        result.add(a.get(i++));
    }
    
    while (j < b.size()) {
        result.add(b.get(j++));
    }
    
    return result;
} 

public static List<Integer> gulagSort(List<Integer> arr) {
    if (arr.size() <= 1) return arr;
    
    List<List<Integer>> gulags = new ArrayList<>();
    gulags.add(arr);
    
    // Separate unsorted elements into gulags
    while (!isSorted(gulags.get(gulags.size() - 1))) {
        List<Integer> current = gulags.get(gulags.size() - 1);
        List<Integer> sorted = new ArrayList<>();
        List<Integer> unsorted = new ArrayList<>();
        
        int prev = current.get(0);
        sorted.add(prev);
        
        for (int i = 1; i < current.size(); i++) {
            if (current.get(i) < prev) {
                unsorted.add(current.get(i));
            } else {
                sorted.add(current.get(i));
                prev = current.get(i);
            }
        }
        
        gulags.set(gulags.size() - 1, sorted);
        gulags.add(unsorted);
    }
    
    // Merge gulags back together
    while (gulags.size() > 1) {
        List<Integer> last = gulags.remove(gulags.size() - 1);
        List<Integer> second = gulags.remove(gulags.size() - 1);
        gulags.add(merge(second, last));
    }
    
    return gulags.get(0);
}`,
  },
]
