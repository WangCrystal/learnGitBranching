var HeadlessGit = require('../src/js/git/headless').HeadlessGit;
var TreeCompare = require('../src/js/git/treeCompare').TreeCompare;

var TIME = 150;
// useful for throwing garbage and then expecting one commit
var oneCommit = '{"branches":{"master":{"target":"C2","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"},"C2":{"parents":["C1"],"id":"C2"}},"HEAD":{"target":"master","id":"HEAD"}}';

var loadTree = function(json) {
  return JSON.parse(unescape(json));
};

var compareAnswer = function(headless, expectedJSON) {
  var expectedTree = loadTree(expectedJSON);
  var actualTree = headless.gitEngine.exportTree();

  return TreeCompare.compareTrees(expectedTree, actualTree);
};

var expectTreeAsync = function(command, expectedJSON) {
  var headless = new HeadlessGit();
  var start = Date.now();
  var haveReported = false;

  runs(function() {
    headless.sendCommand(command);
  });
  waitsFor(function() {
    var diff = (Date.now() - start);
    if (diff > TIME - 50 && !haveReported) {
      haveReported = true;
      console.log('not going to match', command);
      console.log('expected\n>>>>>>>>\n', loadTree(expectedJSON));
      console.log('\n<<<<<<<<<<<\nactual', headless.gitEngine.exportTree());
    }
    return compareAnswer(headless, expectedJSON);
  }, 'trees should be equal', 100);
};

describe('GitEngine', function() {
  it('Commits', function() {
    expectTreeAsync(
      'git commit',
      '{"branches":{"master":{"target":"C2","id":"master","type":"branch"}},"commits":{"C0":{"type":"commit","parents":[],"id":"C0","rootCommit":true},"C1":{"type":"commit","parents":["C0"],"id":"C1"},"C2":{"type":"commit","parents":["C1"],"id":"C2"}},"HEAD":{"id":"HEAD","target":"master","type":"general ref"}}'
    );
  });

  it('handles commit options', function() {
    expectTreeAsync(
      'git commit; git commit --amend;',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C2%27%22%2C%22id%22%3A%22master%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C2%27%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22master%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('throws with bad arg options', function() {
    expectTreeAsync(
      'git commit foo; git commit -am -m; git commit -am -a; git commit -am "hi" "ho"; git commit',
      oneCommit
    );
  });

  it('handles branch options', function() {
    expectTreeAsync(
      'git branch banana C0; git commit; git checkout -b side banana; git branch -d banana;git branch -f another C1; git commit',
      '{"branches":{"master":{"target":"C2","id":"master"},"side":{"target":"C3","id":"side"},"another":{"target":"C1","id":"another"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"},"C2":{"parents":["C1"],"id":"C2"},"C3":{"parents":["C0"],"id":"C3"}},"HEAD":{"target":"side","id":"HEAD"}}'
    );
  });

  it('does add', function() {
    expectTreeAsync(
      'git add; git commit',
      oneCommit
    );
  });

  it('resets with all options', function() {
    expectTreeAsync(
      'git commit;git reset --soft HEAD~1;git reset --hard HEAD~1;gc;go C1;git reset --hard C3;',
      '{"branches":{"master":{"target":"C3","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"},"C2":{"parents":["C1"],"id":"C2"},"C3":{"parents":["C1"],"id":"C3"}},"HEAD":{"target":"C1","id":"HEAD"}}'
    );
  });

  it('Checkouts', function() {
    expectTreeAsync(
      'git checkout -b side',
      '{"branches":{"master":{"target":"C1","id":"master"},"side":{"target":"C1","id":"side"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"side","id":"HEAD"}}'
    );
  });

  it('Rebases', function() {
    expectTreeAsync(
      'gc; git checkout -b side C1; gc; git rebase master',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C2%22%2C%22id%22%3A%22master%22%7D%2C%22side%22%3A%7B%22target%22%3A%22C3%27%22%2C%22id%22%3A%22side%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C3%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C3%22%7D%2C%22C3%27%22%3A%7B%22parents%22%3A%5B%22C2%22%5D%2C%22id%22%3A%22C3%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22side%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('Reverts', function() {
    expectTreeAsync(
      'git revert HEAD',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C1%27%22%2C%22id%22%3A%22master%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C1%27%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C1%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22master%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('Merges', function() {
    expectTreeAsync(
      'gc; git checkout -b side C1; gc; git merge master',
      '{"branches":{"master":{"target":"C2","id":"master"},"side":{"target":"C4","id":"side"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"},"C2":{"parents":["C1"],"id":"C2"},"C3":{"parents":["C1"],"id":"C3"},"C4":{"parents":["C2","C3"],"id":"C4"}},"HEAD":{"target":"side","id":"HEAD"}}'
    );
  });

  it('Resets', function() {
    expectTreeAsync(
      'git commit; git reset HEAD~1',
      '{"branches":{"master":{"target":"C1","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"},"C2":{"parents":["C1"],"id":"C2"}},"HEAD":{"target":"master","id":"HEAD"}}'
    );
  });

  it('Branches', function() {
    expectTreeAsync(
      'git branch side C0',
      '{"branches":{"master":{"target":"C1","id":"master"},"side":{"target":"C0","id":"side"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"master","id":"HEAD"}}'
    );
  });

  it('Deletes branches', function() {
    expectTreeAsync(
      'git branch side; git branch -d side',
      '{"branches":{"master":{"target":"C1","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"master","id":"HEAD"}}'
    );
  });

  it('Ammends commits', function() {
    expectTreeAsync(
      'git commit --amend',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C1%27%22%2C%22id%22%3A%22master%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C1%27%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22master%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('Cherry picks', function() {
    expectTreeAsync(
      'git checkout -b side C0; gc; git cherry-pick C11; git cherry-pick C1',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C1%22%2C%22id%22%3A%22master%22%7D%2C%22side%22%3A%7B%22target%22%3A%22C1%27%22%2C%22id%22%3A%22side%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C1%27%22%3A%7B%22parents%22%3A%5B%22C2%22%5D%2C%22id%22%3A%22C1%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22side%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('Forces branches', function() {
    expectTreeAsync(
      'git checkout -b side; git branch -f side C0',
      '{"branches":{"master":{"target":"C1","id":"master"},"side":{"target":"C0","id":"side"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"side","id":"HEAD"}}'
    );
  });

  it('Rebases only new commits to destination', function() {
    expectTreeAsync(
      'git checkout -b side C0; gc; gc;git cherry-pick C1;git rebase master',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C1%22%2C%22id%22%3A%22master%22%7D%2C%22side%22%3A%7B%22target%22%3A%22C3%27%22%2C%22id%22%3A%22side%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C3%22%3A%7B%22parents%22%3A%5B%22C2%22%5D%2C%22id%22%3A%22C3%22%7D%2C%22C1%27%22%3A%7B%22parents%22%3A%5B%22C3%22%5D%2C%22id%22%3A%22C1%27%22%7D%2C%22C2%27%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%27%22%7D%2C%22C3%27%22%3A%7B%22parents%22%3A%5B%22C2%27%22%5D%2C%22id%22%3A%22C3%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22side%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('checks out after a rebase', function() {
    expectTreeAsync(
      'git commit; git checkout -b bugFix C1; git commit; git rebase master;git checkout master',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C2%22%2C%22id%22%3A%22master%22%7D%2C%22bugFix%22%3A%7B%22target%22%3A%22C3%27%22%2C%22id%22%3A%22bugFix%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C3%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C3%22%7D%2C%22C3%27%22%3A%7B%22parents%22%3A%5B%22C2%22%5D%2C%22id%22%3A%22C3%27%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22master%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });

  it('solves merging level', function() {
    expectTreeAsync(
      'git checkout -b bugFix;git commit;git checkout master;git commit;git merge bugFix',
      '{"branches":{"master":{"target":"C1","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"master","id":"HEAD"}}'
    );
  });

  it('solves rebase level', function() {
    expectTreeAsync(
      'git checkout -b bugFix;git commit;git checkout master;git commit;git checkout bugFix;git rebase master',
      '{"branches":{"master":{"target":"C1","id":"master"}},"commits":{"C0":{"parents":[],"id":"C0","rootCommit":true},"C1":{"parents":["C0"],"id":"C1"}},"HEAD":{"target":"master","id":"HEAD"}}'
    );
  });

  it('does a whole bunch of crazy merging', function() {
    expectTreeAsync(
      'gc;go -b side C1;gc;git merge master;go -b bug master;gc;go -b wut C3;git rebase bug;go side;git rebase wut;gc;git rebase wut;git merge C4;go master;git rebase side;go C6;git merge C3\';gb -f wut C8;go bug;git rebase wut',
      '%7B%22branches%22%3A%7B%22master%22%3A%7B%22target%22%3A%22C7%22%2C%22id%22%3A%22master%22%7D%2C%22side%22%3A%7B%22target%22%3A%22C7%22%2C%22id%22%3A%22side%22%7D%2C%22bug%22%3A%7B%22target%22%3A%22C8%22%2C%22id%22%3A%22bug%22%7D%2C%22wut%22%3A%7B%22target%22%3A%22C8%22%2C%22id%22%3A%22wut%22%7D%7D%2C%22commits%22%3A%7B%22C0%22%3A%7B%22parents%22%3A%5B%5D%2C%22id%22%3A%22C0%22%2C%22rootCommit%22%3Atrue%7D%2C%22C1%22%3A%7B%22parents%22%3A%5B%22C0%22%5D%2C%22id%22%3A%22C1%22%7D%2C%22C2%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C2%22%7D%2C%22C3%22%3A%7B%22parents%22%3A%5B%22C1%22%5D%2C%22id%22%3A%22C3%22%7D%2C%22C4%22%3A%7B%22parents%22%3A%5B%22C2%22%2C%22C3%22%5D%2C%22id%22%3A%22C4%22%7D%2C%22C5%22%3A%7B%22parents%22%3A%5B%22C2%22%5D%2C%22id%22%3A%22C5%22%7D%2C%22C3%27%22%3A%7B%22parents%22%3A%5B%22C5%22%5D%2C%22id%22%3A%22C3%27%22%7D%2C%22C6%22%3A%7B%22parents%22%3A%5B%22C4%22%5D%2C%22id%22%3A%22C6%22%7D%2C%22C6%27%22%3A%7B%22parents%22%3A%5B%22C3%27%22%5D%2C%22id%22%3A%22C6%27%22%7D%2C%22C7%22%3A%7B%22parents%22%3A%5B%22C4%22%2C%22C6%27%22%5D%2C%22id%22%3A%22C7%22%7D%2C%22C8%22%3A%7B%22parents%22%3A%5B%22C3%27%22%2C%22C6%22%5D%2C%22id%22%3A%22C8%22%7D%7D%2C%22HEAD%22%3A%7B%22target%22%3A%22bug%22%2C%22id%22%3A%22HEAD%22%7D%7D'
    );
  });
});

