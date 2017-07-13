
function jsonEditor(){

}


jsonEditor.options = {};

jsonEditor.options['item'] = {}

////////////////////////////////////////////////
// item
////////////////////////////////////////////////

jsonEditor.options['item']['ansible_connection'] = {
    type:'text',
    help:'Inventory Parameter - ansible_host',
    helpcontent:'Connection type to the host. This can be the name of any of\
            ansible’s connection plugins. SSH protocol types are smart, ssh or\
            paramiko. The default is smart. Non-SSH based types are described\
            in the next section.'
}

jsonEditor.options['item']['ansible_host'] = {
    type:'text',
    help:'Inventory Parameter - ansible_host',
    helpcontent:'The name of the host to connect to, if different from the alias you wish to give to it.'
}

jsonEditor.options['item']['ansible_port'] = {
    type:'text',
    help:'Inventory Parameter - ansible_port',
    helpcontent:'The ssh port number, if not 22'
}

jsonEditor.options['item']['ansible_user'] = {
    type:'text',
    help:'Inventory Parameter - ansible_user',
    helpcontent:'The default ssh user name to use.'
}

jsonEditor.options['item']['ansible_ssh_pass'] = {
    type:'text',
    help:'Inventory Parameter - ansible_ssh_pass',
    helpcontent:'The ssh password to use (never store this variable in plain text; always use a vault.)'
}

jsonEditor.options['item']['ansible_ssh_private_key_file'] = {
    type:'textarea',
    help:'Inventory Parameter - ansible_ssh_private_key_file',
    helpcontent:'Private key file used by ssh. Useful if using multiple keys and you don’t want to use SSH agent.'
}

jsonEditor.options['item']['ansible_ssh_common_args'] = {
    type:'text',
    help:'Inventory Parameter - ansible_ssh_common_args',
    helpcontent:'This setting is always appended to the default command line for sftp, scp, and ssh. Useful to configure a ProxyCommand for a certain host (or group).'
}

jsonEditor.options['item']['ansible_sftp_extra_args'] = {
    type:'text',
    help:'Inventory Parameter - ansible_sftp_extra_args',
    helpcontent:'This setting is always appended to the default sftp command line.'
}

jsonEditor.options['item']['ansible_scp_extra_args'] = {
    type:'text',
    help:'Inventory Parameter - ansible_scp_extra_args',
    helpcontent:'This setting is always appended to the default scp command line.'
}

jsonEditor.options['item']['ansible_ssh_extra_args'] = {
    type:'text',
    help:'Inventory Parameter - ansible_ssh_extra_args',
    helpcontent:'This setting is always appended to the default ssh command line.'
}

jsonEditor.options['item']['ansible_ssh_pipelining'] = {
    type:'text',
    help:'Inventory Parameter - ansible_ssh_pipelining',
    helpcontent:'Determines whether or not to use SSH pipelining. This can override the pipelining setting in ansible.cfg.'
}

jsonEditor.options['item']['ansible_ssh_executable'] = {
    type:'text',
    help:'Inventory Parameter - ansible_ssh_executable',
    helpcontent:'This setting overrides the default behavior to use the system ssh. This can override the ssh_executable setting in ansible.cfg.'
}

jsonEditor.options['item']['ansible_become'] = {
    type:'text',
    help:'Inventory Parameter - ansible_become',
    helpcontent:'Equivalent to ansible_sudo or ansible_su, allows to force privilege escalation'
}

jsonEditor.options['item']['ansible_become_method'] = {
    type:'text',
    help:'Inventory Parameter - ansible_become_method',
    helpcontent:'Allows to set privilege escalation method'
}

jsonEditor.options['item']['ansible_become_user'] = {
    type:'text',
    help:'Inventory Parameter - ansible_become_user',
    helpcontent:'Equivalent to ansible_sudo_user or ansible_su_user, allows to set the user you become through privilege escalation'
}

jsonEditor.options['item']['ansible_become_pass'] = {
    type:'text',
    help:'Inventory Parameter - ansible_become_pass',
    helpcontent:'Equivalent to ansible_sudo_pass or ansible_su_pass, allows you to set the privilege escalation password (never store this variable in plain text; always use a vault.)'
}

jsonEditor.options['item']['ansible_shell_type'] = {
    type:'text',
    help:'Inventory Parameter - ansible_shell_type',
    helpcontent:'The shell type of the target system. You should not use this \n\
                setting unless you have set the ansible_shell_executable to a \n\
                non-Bourne (sh) compatible shell. By default commands are \n\
                formatted using sh-style syntax. Setting this to csh or fish \n\
                will cause commands executed on target systems to follow those\n\
                shell’s syntax instead.'
}

jsonEditor.options['item']['ansible_python_interpreter'] = {
    type:'text',
    help:'Inventory Parameter - ansible_python_interpreter',
    helpcontent:'The target host python path. This is useful for systems with \n\
               more than one Python or not located at /usr/bin/python such as\n\
               *BSD, or where /usr/bin/python is not a 2.X series Python.\n\
               We do not use the /usr/bin/env mechanism as that requires the\n\
               remote user’s path to be set right and also assumes the python\n\
               executable is named python, where the executable might be named\n\
               something like python2.6.'
}

jsonEditor.options['item']['ansible_shell_executable'] = {
    type:'text',
    help:'Inventory Parameter - ansible_shell_executable',
    helpcontent:'This sets the shell the ansible controller will use on the \n\
                target machine, overrides executable in ansible.cfg which \n\
                defaults to /bin/sh. You should really only change it if is not\n\
                possible to use /bin/sh (i.e. /bin/sh is not installed on the\n\
                target machine or cannot be run from sudo.).'
}

////////////////////////////////////////////////
// tasks
////////////////////////////////////////////////

jsonEditor.options['tasks'] = {}
jsonEditor.options['tasks']['ask-vault-pass'] = {
    type:'password',
    help:'--ask-vault-pass',
    helpcontent:'ask for vault password',
    alias:''
}

jsonEditor.options['tasks']['check'] = {
    type:'boolean',
    help:'--check',
    helpcontent:"don't make any changes; instead, try to predict some of the changes that may occur",
    alias:'C'
}

jsonEditor.options['tasks']['diff'] = {
    type:'boolean',
    help:'--diff',
    helpcontent:"when changing (small) files and templates, show the differences in those files; works great with --check",
    alias:'D'
}

jsonEditor.options['tasks']['extra-vars'] = {
    type:'textarea',
    help:'-e EXTRA_VARS, --extra-vars=EXTRA_VARS',
    helpcontent:"set additional variables as key=value or YAML/JSON",
    alias:'e'
}

jsonEditor.options['tasks']['flush-cache'] = {
    type:'boolean',
    help:'--flush-cache',
    helpcontent:"clear the fact cache",
    alias:''
}

jsonEditor.options['tasks']['force-handlers'] = {
    type:'boolean',
    help:'--force-handlers',
    helpcontent:"run handlers even if a task fails",
    alias:''
}

jsonEditor.options['tasks']['forks'] = {
    type:'textarea',
    help:'-f FORKS, --forks=FORKS',
    helpcontent:"specify number of parallel processes to use (default=5)",
    alias:'f'
}

jsonEditor.options['tasks']['help'] = {
    type:'boolean',
    help:'--help',
    helpcontent:"show ansible help message and exit",
    alias:'h'
}

jsonEditor.options['tasks']['inventory-file'] = {
    type:'text',
    help:'-i INVENTORY, --inventory-file=INVENTORY',
    helpcontent:"specify inventory host path (default=/etc/ansible/hosts) or comma separated host list.",
    alias:'i'
}

jsonEditor.options['tasks']['limit'] = {
    type:'text',
    help:'-l SUBSET, --limit=SUBSET',
    helpcontent:"further limit selected hosts to an additional pattern",
    alias:'l'
}

jsonEditor.options['tasks']['list-hosts'] = {
    type:'boolean',
    help:'--list-hosts',
    helpcontent:"outputs a list of matching hosts; does not execute anything else",
    alias:''
}

jsonEditor.options['tasks']['list-tags'] = {
    type:'boolean',
    help:'--list-tags',
    helpcontent:"list all available tags",
    alias:''
}

jsonEditor.options['tasks']['list-tasks'] = {
    type:'boolean',
    help:'--list-tasks',
    helpcontent:"list all tasks that would be executed",
    alias:''
}

jsonEditor.options['tasks']['module-path'] = {
    type:'text',
    help:'-M MODULE_PATH, --module-path=MODULE_PATH',
    helpcontent:"specify path(s) to module library (default=None)",
    alias:''
}

jsonEditor.options['tasks']['new-vault-password-file'] = {
    type:'textarea',
    help:'--new-vault-password-file=NEW_VAULT_PASSWORD_FILE',
    helpcontent:"new vault password file for rekey",
    alias:''
}

jsonEditor.options['tasks']['output'] = {
    type:'textarea',
    help:'--output=OUTPUT_FILE',
    helpcontent:"output file name for encrypt or decrypt; use - for stdout",
    alias:''
}

jsonEditor.options['tasks']['skip-tags'] = {
    type:'textarea',
    help:'--skip-tags=SKIP_TAGS',
    helpcontent:"only run plays and tasks whose tags do not match these values",
    alias:''
}

jsonEditor.options['tasks']['start-at-task'] = {
    type:'textarea',
    help:'--start-at-task=START_AT_TASK',
    helpcontent:"start the playbook at the task matching this name",
    alias:''
}

jsonEditor.options['tasks']['step'] = {
    type:'boolean',
    help:'--step',
    helpcontent:"one-step-at-a-time: confirm each task before running",
    alias:''
}

jsonEditor.options['tasks']['syntax-check'] = {
    type:'boolean',
    help:'--syntax-check',
    helpcontent:"perform a syntax check on the playbook, but do not execute it",
    alias:''
}

jsonEditor.options['tasks']['tags'] = {
    type:'text',
    help:'-t TAGS, --tags=TAGS',
    helpcontent:"only run plays and tasks tagged with these values",
    alias:'t'
}

jsonEditor.options['tasks']['vault-password-file'] = {
    type:'textarea',
    help:'--vault-password-file=VAULT_PASSWORD_FILE',
    helpcontent:"vault password file",
    alias:''
}

/*
jsonEditor.options['tasks']['verbose'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'v'
}

jsonEditor.options['tasks']['vv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vv'
}

jsonEditor.options['tasks']['vvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvv'
}

jsonEditor.options['tasks']['vvvv'] = {
    type:'boolean',
    help:'-v, --verbose',
    helpcontent:"verbose mode (-vvv for more, -vvvv to enable connection debugging)",
    alias:'vvvv'
}*/

jsonEditor.options['tasks']['version'] = {
    type:'boolean',
    help:'--version',
    helpcontent:"show program's version number and exit",
    alias:''
}

jsonEditor.options['tasks']['ask-pass'] = {
    type:'boolean',
    help:'-k, --ask-pass',
    helpcontent:"ask for connection password\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'k'
}

jsonEditor.options['tasks']['private-key'] = {
    type:'textarea',
    help:'--private-key=PRIVATE_KEY_FILE, --key-file=PRIVATE_KEY_FILE',
    helpcontent:"use this file to authenticate the connection\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['user'] = {
    type:'text',
    help:'-u REMOTE_USER, --user=REMOTE_USER',
    helpcontent:"connect as this user (default=None)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'u'
}

jsonEditor.options['tasks']['connection'] = {
    type:'text',
    help:'-c CONNECTION, --connection=CONNECTION',
    helpcontent:"connection type to use (default=smart)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'c'
}

jsonEditor.options['tasks']['timeout'] = {
    type:'text',
    help:'-T TIMEOUT, --timeout=TIMEOUT',
    helpcontent:"override the connection timeout in seconds (default=10)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:'T'
}

jsonEditor.options['tasks']['ssh-common-args'] = {
    type:'textarea',
    help:'--ssh-common-args=SSH_COMMON_ARGS',
    helpcontent:"specify common arguments to pass to sftp/scp/ssh (e.g. ProxyCommand)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['sftp-extra-args'] = {
    type:'textarea',
    help:'--sftp-extra-args=SFTP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to sftp only (e.g. -f, -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['scp-extra-args'] = {
    type:'textarea',
    help:'--scp-extra-args=SCP_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to scp only (e.g. -l)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['ssh-extra-args'] = {
    type:'textarea',
    help:'--ssh-extra-args=SSH_EXTRA_ARGS',
    helpcontent:"specify extra arguments to pass to ssh only (e.g. -R)\n<br><i>Connection options group: control as whom and how to connect to hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['sudo'] = {
    type:'boolean',
    help:'-s, --sudo',
    helpcontent:"run operations with sudo (nopasswd) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'s'
}

jsonEditor.options['tasks']['sudo'] = {
    type:'text',
    help:'-U SUDO_USER, --sudo-user=SUDO_USER',
    helpcontent:"desired sudo user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'U'
}

jsonEditor.options['tasks']['su'] = {
    type:'text',
    help:'-S, --su',
    helpcontent:"run operations with su (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'S'
}

jsonEditor.options['tasks']['su-user'] = {
    type:'text',
    help:'-R SU_USER, --su-user=SU_USER',
    helpcontent:"run operations with su as this user (default=root) (deprecated, use become)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'R'
}

jsonEditor.options['tasks']['become'] = {
    type:'boolean',
    help:'-b, --become',
    helpcontent:"run operations with become (does not imply password prompting)\n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'b'
}

jsonEditor.options['tasks']['become-method'] = {
    type:'text',
    help:'--become-method=BECOME_METHOD',
    helpcontent:"privilege escalation method to use (default=sudo), valid choices: [ sudo | su | pbrun | pfexec | doas | dzdo | ksu ]\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['become-user'] = {
    type:'text',
    help:'--become-user=BECOME_USER',
    helpcontent:"run operations as this user (default=root)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['ask-sudo-pass'] = {
    type:'boolean',
    help:'--ask-sudo-pass',
    helpcontent:"ask for sudo password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['ask-su-pass'] = {
    type:'boolean',
    help:'--ask-su-pass',
    helpcontent:"ask for su password (deprecated, use become)\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:''
}

jsonEditor.options['tasks']['ask-become-pass'] = {
    type:'boolean',
    help:'-K, --ask-become-pass',
    helpcontent:"ask for privilege escalation password\
                    \n<br><i>Privilege escalation options group: control how and which user you become as on target hosts</i>",
    alias:'K'
}

////////////////////////////////////////////////
// jsonEditor
////////////////////////////////////////////////

jsonEditor.editor = function(json, opt)
{
    if(!opt)
    {
        opt = {}
    }
    
    if(!opt.title1)
    {
        opt.title1 = 'Variables'
    }
    
    if(!opt.title2)
    {
        opt.title2 = 'Adding new variable'
    }
    
    return spajs.just.render('jsonEditor', {data:json, optionsblock:opt.block, opt})
}

jsonEditor.jsonEditorGetValues = function()
{
    var data = {}
    var arr = $(".jsonEditor-data")
    for(var i = 0; i< arr.length; i++)
    {
        var type = $(arr[i]).attr('data-type');
        var index = $(arr[i]).attr('data-json-name');

        if(type == "boolean")
        {
            data[index] = $(arr[i]).hasClass('selected')
        }
        else
        {
            data[index] = $(arr[i]).val()
        }
    }

    return data
}

jsonEditor.jsonEditorAddVar = function(optionsblock)
{
    if(!optionsblock)
    {
        optionsblock = 'base'
    }

    var name = $('#new_json_name').val()
    var value = $('#new_json_value').val()

    if(!name)
    {
        $.notify("Empty varible name", "error");
        return;
    }

    if($("#json_"+name+"_value").length)
    {
        $.notify("This var already exists", "error");
        return;
    }

    if(/^--/.test(name))
    {
        name = name.replace(/^--/, "ansible_")
    }

    if(/^-[A-z]$/.test(name))
    {
        for(var i in jsonEditor.options[optionsblock])
        {
            if("-"+jsonEditor.options[optionsblock][i].alias == name)
            {
                name = i
                break;
            }
        }
    }

    $('#new_json_name').val('')
    $('#new_json_value').val('')

    $("#jsonEditorVarList").append(spajs.just.render('jsonEditorLine', {name:name, value:value, optionsblock:optionsblock}))
}

