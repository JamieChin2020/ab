const JD_API_HOST = 'https://wq.jd.com/';
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
$.tokens = JSON.parse($.getdata('jx_tokens') || '[]');
$.showLog = $.getdata('nc_showLog') ? $.getdata('nc_showLog') === 'true' : false;
$.openUrl = `openjd://virtual?params=${encodeURIComponent(
  '{ "category": "jump", "des": "m", "url": "https://wqsh.jd.com/sns/201912/12/jxnc/detail.html?ptag=7155.9.32&smp=b47f4790d7b2a024e75279f55f6249b9&active=jdnc_1_chelizi1205_2"}',
)}`;
$.result = [];
$.cookieArr = [];
$.currentCookie = '';
$.currentToken = {};
$.allTask = [];
$.info = {};
$.answer = 0;
$.helpTask = null;
$.drip = 0;

!(async () => {
  if (!getCookies()) return;
  for (let i = 0; i < $.cookieArr.length; i++) {
    $.currentCookie = $.cookieArr[i];
    $.currentToken = $.tokens[i] || {};
    $.drip = 0;
    if ($.currentCookie) {
      const userName = decodeURIComponent(
        $.currentCookie.match(/pt_pin=(.+?);/) && $.currentCookie.match(/pt_pin=(.+?);/)[1],
      );
      $.log(`\n��ʼ��NONE�˺�${i + 1}��${userName}`);
      $.result.push(`��NONE�˺�${i + 1}��${userName}`);
      const startInfo = await getTaskList();
      if (!startInfo) break;
      await $.wait(500);
      const isOk = await browserTask();
      if (!isOk) break;
      await $.wait(500);
      await answerTask();
      await $.wait(500);
      const endInfo = await getTaskList();
      getMessage(endInfo, startInfo);
      await submitInviteId(userName);
      await $.wait(500);
      //await createAssistUser();
    }
  }
  await showMsg();
})()
  .catch(e => $.logErr(e))
  .finally(() => $.done());

function getCookies() {
  if ($.isNode()) {
    $.cookieArr = Object.values(jdCookieNode);
  } else {
    const CookiesJd = JSON.parse($.getdata("CookiesJD") || "[]").filter(x => !!x).map(x => x.cookie);
    $.cookieArr = [$.getdata("CookieJD") || "", $.getdata("CookieJD2") || "", ...CookiesJd].filter(x=>!!x);
  }
  if (!$.cookieArr[0]) {
    $.msg($.name, '����ʾ�����Ȼ�ȡNONE�˺�һcookie\nֱ��ʹ��NobyDa��NONEǩ����ȡ', 'https://bean.m.jd.com/', {
      'open-url': 'https://bean.m.jd.com/',
    });
    return false;
  }
  return true;
}

function getMessage(endInfo) {
  const need = endInfo.target - endInfo.score;
  const get = $.drip;
  $.result.push(
    `��ˮ�����ơ�${endInfo.prizename}`,
    `��ˮ�Ρ����ˮ��${get} ����ˮ��${need}`
  );
  if (get > 0) {
    const max = parseInt(need / get);
    const min = parseInt(need / (get + $.helpTask.limit * $.helpTask.eachtimeget));
    $.result.push(`��Ԥ�⡿���� ${min} ~ ${max} ��`);
  }
}

function getTaskList() {
  return new Promise(async resolve => {
    $.get(taskUrl('query', `type=1`), async (err, resp, data) => {
      try {
        const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
        const { detail, msg, task = [], retmsg, ...other } = JSON.parse(res);
        $.helpTask = task.filter(x => x.tasktype === 2)[0] || { eachtimeget: 0, limit: 0 };
        $.allTask = task.filter(x => x.tasktype !== 3 && x.tasktype !== 2 && parseInt(x.left) > 0);
        $.info = other;
        $.log(`\n��ȡ�����б� ${retmsg} �ܹ�${$.allTask.length}������`);
        if (!$.info.active) {
          $.msg($.name, '����ȥNONEũ��ѡ�����ӣ�', 'ѡ��appר������ʱ����ο��ű�ͷ��˵����ȡtoken�����֪ͨ��ת', { 'open-url': $.openUrl });
          resolve(false);
        }
        resolve(other);
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(true);
      }
    });
  });
}

function  browserTask() {
  return new Promise(async resolve => {
    const tasks = $.allTask.filter(x => x.tasklevel !== 6);
    const times = Math.max(...[...tasks].map(x => x.limit));
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      $.log(`\n��ʼ��${i + 1}������${task.taskname}`);
      const status = [0];
      for (let i = 0; i < times; i++) {
        const random = Math.random() * 3;
        await $.wait(random * 1000);
        if (status[0] === 0) {
          status[0] = await doTask(task);
        }
        if (status[0] !== 0) {
          break;
        }
      }
      if (status[0] === 1032) {
        $.msg($.name, '��ο��ű�ͷ��˵����ȡtoken', '���߸��з�appר�����ӣ����֪ͨ��ת', { 'open-url': $.openUrl });
        resolve(false);
        return;
      }
      $.log(`\n������${i + 1}������${task.taskname}\n`);
    }
    resolve(true);
  });
}

function answerTask() {
  const _answerTask = $.allTask.filter(x => x.tasklevel === 6);
  if (!_answerTask || !_answerTask[0]) return;
  const { tasklevel, left, taskname, eachtimeget } = _answerTask[0];
  return new Promise(async resolve => {
    if (parseInt(left) <= 0) {
      resolve(false);
      $.log(`\n${taskname}[������]�� ��������ɣ�����`);
      return;
    }
    $.get(
      taskUrl(
        'dotask',
        `active=${$.info.active}&answer=${$.info.indexday}:${['A', 'B', 'C', 'D'][$.answer]}:0&joinnum=${
          $.info.joinnum
        }&tasklevel=${tasklevel}&_stk=active%2Canswer%2Cch%2Cfarm_jstoken%2Cjoinnum%2Cphoneid%2Ctasklevel%2Ctimestamp`,
      ),
      async (err, resp, data) => {
        try {
          const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
          let { ret, retmsg, right } = JSON.parse(res);
          retmsg = retmsg !== '' ? retmsg : 'success';
          $.log(
            `\n${taskname}[������]��${retmsg.indexOf('�̫����') !== -1 ? '��������л���δ������ʱ��' : retmsg}${
              $.showLog ? '\n' + res : ''
            }`,
          );
          if (ret === 0 && right === 1) {
            $.drip += eachtimeget;
          }
          if (((ret !== 0 && ret !== 1029) || retmsg === 'ans err') && $.answer < 4) {
            $.answer++;
            await $.wait(1000);
            await answerTask();
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function doTask({ tasklevel, left, taskname, eachtimeget }) {
  return new Promise(async resolve => {
    if (parseInt(left) <= 0) {
      resolve(false);
      $.log(`\n${taskname}[������]�� ��������ɣ�����`);
      return;
    }
    $.get(
      taskUrl(
        'dotask',
        `active=${$.info.active}&answer=${$.info.indexday}:D:0&joinnum=${$.info.joinnum}&tasklevel=${tasklevel}&_stk=active%2Canswer%2Cch%2Cfarm_jstoken%2Cjoinnum%2Cphoneid%2Ctasklevel%2Ctimestamp`,
      ),
      (err, resp, data) => {
        try {
          const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
          let { ret, retmsg } = JSON.parse(res);
          retmsg = retmsg !== '' ? retmsg : 'success';
          $.log(
            `\n${taskname}[������]��${retmsg.indexOf('�̫����') !== -1 ? '��������л���δ������ʱ��' : retmsg}${
              $.showLog ? '\n' + res : ''
            }`,
          );
          if (ret === 0) {
            $.drip += eachtimeget;
          }
          resolve(ret);
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function submitInviteId(userName) {
  return new Promise(resolve => {
    if (!$.info || !$.info.smp) {
      resolve();
      return;
    }
    $.log(`\n��Ļ�����: ${$.info.smp}`);
    $.log(`��Ļid: ${$.info.active}`);
    $.post(
      {
        url: `https://api.ninesix.cc/api/jx-nc/${$.info.smp}/${encodeURIComponent(userName)}?active=${$.info.active}&joinnum=${$.info.joinnum}`,
      },
      (err, resp, _data) => {
        try {
          const { code, data = {} } = JSON.parse(_data);
          $.log(`\n�������ύ��${code}\n${$.showLog ? _data : ''}`);
          if (data.value) {
            $.result.push('�������롿�ύ�ɹ���');
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve();
        }
      },
    );
  });
}

function createAssistUser() {
  return new Promise(resolve => {
    $.get({ url: `https://wap.sogou.com` }, async (err, resp, _data) => {
      try {
        const { code, data: { value, extra = {} } = {} } = JSON.parse(_data);
        $.log(`\n��ȡ���������${code}\n${$.showLog ? _data : ''}`);
        if (!value) {
          $.result.push('��ȡ������ʧ�ܣ����Ժ��ٴ��ֶ�ִ�нű���');
          resolve();
          return;
        }
        $.get(
          taskUrl('help', `active=${extra.active}&joinnum=${extra.joinnum}&smp=${value}`),
          async (err, resp, data) => {
            try {
              const res = data.match(/try\{whyour\(([\s\S]*)\)\;\}catch\(e\)\{\}/)[1];
              const { ret, retmsg = '' } = JSON.parse(res);
              $.log(`\n������${retmsg} \n${$.showLog ? res : ''}`);
              if (ret === 0) {
                await createAssistUser();
              }
            } catch (e) {
              $.logErr(e, resp);
            } finally {
              resolve();
            }
          },
        );
      } catch (e) {
        $.logErr(e, resp);
        resolve();
      }
    });
  });
}

function showMsg() {
  return new Promise(resolve => {
    $.msg($.name, '', `\n${$.result.join('\n')}`);
    resolve();
  });
}

function taskUrl(function_path, body) {
  return {
    url: `${JD_API_HOST}cubeactive/farm/${function_path}?${body}&farm_jstoken=${
      $.currentToken['farm_jstoken']
    }&phoneid=${$.currentToken['phoneid']}&timestamp=${
      $.currentToken['timestamp']
    }&sceneval=2&g_login_type=1&callback=whyour&_=${Date.now()}&g_ty=ls`,
    headers: {
      Cookie: $.currentCookie,
      Accept: `*/*`,
      Connection: `keep-alive`,
      Referer: `https://st.jingxi.com/pingou/dream_factory/index.html`,
      'Accept-Encoding': `gzip, deflate, br`,
      Host: `wq.jd.com`,
      'Accept-Language': `zh-cn`,
    },
  };
}