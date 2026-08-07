const testCompiler = async () => {
  const run = async (lang, code, stdin) => {
    const res = await fetch('http://localhost:3000/api/piston', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, code, stdin })
    });
    const data = await res.json();
    console.log('\n=== ' + lang.toUpperCase() + ' TEST ===');
    console.log('Status:', data.status);
    console.log('Runtime:', data.data?.runtime_ms + 'ms');
    console.log('Output:\n' + (data.data?.run?.stdout || data.data?.run?.stderr || '').trim());
  };

  const pyCode = `
import threading
import time

def worker(num):
    time.sleep(0.1)
    print(f'Worker {num} finished computing ✨')

threads = []
for i in range(3):
    t = threading.Thread(target=worker, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print('All Python threads executed successfully! 🚀')
`;

  const jsCode = `
class DataProcessor {
  constructor(data) {
    this.data = data;
  }
  async process() {
    return new Promise(resolve => {
      setTimeout(() => {
        const sorted = [...this.data].sort((a, b) => b - a);
        resolve(sorted.map(x => x * 2));
      }, 150);
    });
  }
}

(async () => {
  const processor = new DataProcessor([5, 1, 9, 3, 7]);
  const result = await processor.process();
  console.log('JavaScript Async Processing Complete ⚡');
  console.log('Result:', result.join(', '));
})();
`;

  const javaCode = `
import java.util.concurrent.*;
import java.util.*;

class ComplexTask implements Callable<String> {
    private int id;
    public ComplexTask(int id) { this.id = id; }
    public String call() throws Exception {
        Thread.sleep(100);
        return "Task " + id + " 🎯";
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(3);
        List<Future<String>> futures = new ArrayList<>();
        
        for (int i = 0; i < 3; i++) {
            futures.add(executor.submit(new ComplexTask(i)));
        }
        
        System.out.println("Java Executor Service Started ☕");
        for (Future<String> f : futures) {
            System.out.println("Completed: " + f.get());
        }
        executor.shutdown();
    }
}
`;

  await run('python', pyCode);
  await run('javascript', jsCode);
  await run('java', javaCode);
};

testCompiler();
